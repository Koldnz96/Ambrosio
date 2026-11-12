// The form used to write a new recipe and to edit an existing one.
// The ingredient line stays at the top: type an ingredient, press Add, and it drops
// into the list below while the line clears for the next one.
// While you type, it suggests products from the catalog (English or Portuguese names).
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputInstance } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WarningChips } from '@/components/warning-chips';
import { Spacing } from '@/constants/theme';
import { getProduct, searchProducts, type Product } from '@/data/products';
import { ALLERGEN_ICONS, EMPTY_PROFILE, ingredientWarnings, type Profile } from '@/data/warnings';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/i18n/language';

export type IngredientInput = {
  name: string;
  amount: number | null;
  unit: string;
  productId: string | null; // the catalog product it was matched to, or null if typed freely
};

export type RecipeInput = {
  name: string;
  ingredients: IngredientInput[];
};

type Item = IngredientInput & { key: number }; // an ingredient already added to the list
type Draft = { name: string; amount: string; unit: string; productId: string | null }; // the line being typed

const EMPTY_DRAFT: Draft = { name: '', amount: '', unit: '', productId: null };

let itemCounter = 0;
function nextKey(): number {
  itemCounter += 1;
  return itemCounter;
}

// Tiny icons shown on a suggestion: the allergens (and vegan) that apply to this person.
function suggestionIcons(productId: string, profile: Profile): string {
  return ingredientWarnings(productId, profile)
    .map((w) => (w.kind === 'allergen' ? ALLERGEN_ICONS[w.allergen] : w.kind === 'vegan' ? '🌱⚠️' : ''))
    .join(' ');
}

type Props = {
  title: string;
  submitLabel: string;
  initial?: RecipeInput;
  clearOnSave?: boolean; // true for "new recipe": empty the form after saving
  profile?: Profile; // allergies and vegan: used to show warnings
  onSubmit: (input: RecipeInput) => Promise<void>;
  onCancel?: () => void;
};

export function RecipeForm({ title, submitLabel, initial, clearOnSave, profile = EMPTY_PROFILE, onSubmit, onCancel }: Props) {
  const theme = useTheme();
  const { t, lang, product: productLabel, ingredient: ingredientLabel, categoryName } = useLanguage();
  const [name, setName] = useState(initial?.name ?? '');
  const [items, setItems] = useState<Item[]>(() =>
    (initial?.ingredients ?? []).map((ing) => ({ ...ing, productId: ing.productId ?? null, key: nextKey() })),
  );
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [suggesting, setSuggesting] = useState(false); // are suggestions open?
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ingredientRef = useRef<TextInputInstance>(null);
  const amountRef = useRef<TextInputInstance>(null);
  const unitRef = useRef<TextInputInstance>(null);

  const suggestions =
    suggesting && draft.name.trim() !== '' && !draft.productId ? searchProducts(draft.name, lang) : [];
  const draftProduct = getProduct(draft.productId);

  function changeDraft(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function pickProduct(product: Product) {
    setDraft((current) => ({
      ...current,
      name: productLabel(product),
      productId: product.id,
      unit: current.unit.trim() ? current.unit : product.unit,
    }));
    setSuggesting(false);
    amountRef.current?.focus();
  }

  // Turn the typed line into an ingredient, or return it as an error message.
  function draftToItem(): IngredientInput | string {
    const text = draft.name.trim();
    if (!text) return t('errTypeIngredient');
    const amount = draft.amount.trim() === '' ? null : Number(draft.amount.replace(',', '.'));
    if (amount !== null && Number.isNaN(amount)) {
      return t('errAmount', { name: text });
    }
    return { name: text, amount, unit: draft.unit.trim(), productId: draft.productId };
  }

  function addIngredient() {
    const result = draftToItem();
    if (typeof result === 'string') {
      setError(result);
      return;
    }
    setError('');
    setItems((current) => [...current, { ...result, key: nextKey() }]);
    setDraft(EMPTY_DRAFT);
    setSuggesting(false);
    ingredientRef.current?.focus(); // the line stays on top, ready for the next ingredient
  }

  function removeItem(key: number) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  // Bring an added ingredient back up to the typing line, to change it.
  function editItem(item: Item) {
    if (draft.name.trim() !== '') {
      setError(t('errAddFirst'));
      return;
    }
    setError('');
    setDraft({
      name: item.name,
      amount: item.amount === null ? '' : String(item.amount),
      unit: item.unit,
      productId: item.productId,
    });
    removeItem(item.key);
    ingredientRef.current?.focus();
  }

  async function submit() {
    setError('');
    if (!name.trim()) {
      setError(t('errRecipeName'));
      return;
    }
    const ingredients: IngredientInput[] = items.map(({ key: _key, ...ing }) => ing);
    if (draft.name.trim() !== '') {
      // Something is typed on the line but not added yet: include it so it is not lost.
      const result = draftToItem();
      if (typeof result === 'string') {
        setError(result);
        return;
      }
      ingredients.push(result);
    }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), ingredients });
      if (clearOnSave) {
        setName('');
        setItems([]);
        setDraft(EMPTY_DRAFT);
        setSuggesting(false);
      }
    } catch (err) {
      setError(t('errSave', { message: (err as Error).message }));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <ThemedView type="backgroundElement" style={styles.form}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <TextInput
        style={inputStyle}
        placeholder={t('recipeNamePlaceholder')}
        placeholderTextColor={theme.textSecondary}
        value={name}
        onChangeText={setName}
        onFocus={() => setSuggesting(false)}
      />

      <ThemedText type="small" themeColor="textSecondary">
        {t('ingredientsHelp')}
      </ThemedText>

      {/* The typing line: it always stays here, at the top. */}
      <TextInput
        ref={ingredientRef}
        style={inputStyle}
        placeholder={t('ingredientPlaceholder')}
        placeholderTextColor={theme.textSecondary}
        value={draft.name}
        submitBehavior="submit"
        onFocus={() => setSuggesting(true)}
        onChangeText={(text) => {
          changeDraft({ name: text, productId: null });
          setSuggesting(true);
        }}
        onSubmitEditing={() => {
          if (suggestions.length > 0) pickProduct(suggestions[0]);
          else amountRef.current?.focus();
        }}
      />
      {suggestions.map((p) => (
        <Pressable key={p.id} style={styles.suggestion} onPress={() => pickProduct(p)}>
          <ThemedText type="small">
            {productLabel(p)} {suggestionIcons(p.id, profile)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {categoryName(p.category)}
          </ThemedText>
        </Pressable>
      ))}
      {suggesting && suggestions.length === 0 && !draft.productId && draft.name.trim().length >= 2 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('notInCatalog')}
        </ThemedText>
      ) : null}
      {draftProduct ? (
        <ThemedText type="small" themeColor="textSecondary">
          {categoryName(draftProduct.category)}
        </ThemedText>
      ) : null}
      {draftProduct ? <WarningChips warnings={ingredientWarnings(draftProduct.id, profile)} /> : null}
      <ThemedView type="backgroundElement" style={styles.row}>
        <TextInput
          ref={amountRef}
          style={[inputStyle, styles.amount]}
          placeholder={t('amountPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          value={draft.amount}
          submitBehavior="submit"
          onFocus={() => setSuggesting(false)}
          onChangeText={(text) => changeDraft({ amount: text })}
          onSubmitEditing={() => unitRef.current?.focus()}
        />
        <TextInput
          ref={unitRef}
          style={[inputStyle, styles.unit]}
          placeholder={t('unitPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          value={draft.unit}
          submitBehavior="submit"
          onFocus={() => setSuggesting(false)}
          onChangeText={(text) => changeDraft({ unit: text })}
          onSubmitEditing={addIngredient}
        />
      </ThemedView>
      <Pressable style={styles.smallButton} onPress={addIngredient}>
        <ThemedText type="smallBold">{t('addIngredient')}</ThemedText>
      </Pressable>

      {/* The ingredients added so far: the list grows downward. */}
      {items.map((item) => (
        <ThemedView key={item.key} type="backgroundElement" style={styles.itemRow}>
          <ThemedView type="backgroundElement" style={styles.itemText}>
            <ThemedText type="small">
              {[item.amount ?? '', item.unit, ingredientLabel(item)].filter((part) => part !== '').join(' ')}
            </ThemedText>
            <WarningChips warnings={ingredientWarnings(item.productId, profile)} />
          </ThemedView>
          <Pressable style={styles.smallButton} onPress={() => editItem(item)}>
            <ThemedText type="smallBold">{t('edit')}</ThemedText>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={() => removeItem(item.key)}>
            <ThemedText type="smallBold">✕</ThemedText>
          </Pressable>
        </ThemedView>
      ))}

      {/* Save sits far from "+ Add ingredient": below a divider, on the right. */}
      <ThemedView style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
      <ThemedView type="backgroundElement" style={styles.footer}>
        {onCancel ? (
          <Pressable style={styles.button} disabled={saving} onPress={onCancel}>
            <ThemedText type="smallBold">{t('cancel')}</ThemedText>
          </Pressable>
        ) : null}
        <Pressable style={styles.button} disabled={saving} onPress={submit}>
          <ThemedText type="smallBold">{saving ? t('saving') : submitLabel}</ThemedText>
        </Pressable>
      </ThemedView>
      {error ? <ThemedText type="small">{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  form: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, maxWidth: 520 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  suggestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  divider: { height: 1, marginTop: Spacing.four },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.two },
  itemRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  itemText: { flex: 1, gap: Spacing.one },
  amount: { flex: 1 },
  unit: { flex: 2 },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
