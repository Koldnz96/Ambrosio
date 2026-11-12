// The product catalog: every ingredient the app knows, with its category, unit,
// Portuguese search names (aliases) and allergens.
//
// ALLERGEN DATA IS A GENERAL GUIDE ONLY, NOT A GUARANTEE. Brands differ, so
// always check the packaging. "allergens" = the product normally contains it;
// "mayContain" = it often has traces of it, or some brands do.
//
// Each product is one row of text in this format (a | separates the fields):
//   name | unit | form | aliases | allergens | mayContain
// - unit: g, ml or unit (empty = the default of its category)
// - form: fresh, dried, canned, jarred, ground, cured, smoked or processed (empty = fresh)
// - aliases: other names people type, separated by ;
// - allergens and mayContain: codes separated by , (see ALLERGEN_LABELS)

export type Category =
  | 'vegetables'
  | 'fruit'
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'grains'
  | 'legumes'
  | 'herbs'
  | 'spices'
  | 'condiments'
  | 'oils'
  | 'baking'
  | 'canned'
  | 'nuts'
  | 'drinks';

export const CATEGORY_LABELS: Record<Category, string> = {
  vegetables: 'Vegetables',
  fruit: 'Fruit',
  meat: 'Meat',
  fish: 'Fish and seafood',
  dairy: 'Dairy and eggs',
  grains: 'Grains and pasta',
  legumes: 'Legumes',
  herbs: 'Fresh herbs',
  spices: 'Spices (dried)',
  condiments: 'Condiments and sauces',
  oils: 'Oils and fats',
  baking: 'Baking',
  canned: 'Canned and jarred',
  nuts: 'Nuts and seeds',
  drinks: 'Drinks',
};

// The 14 allergens that EU law requires to be declared.
export type Allergen =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soybeans'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten (wheat, rye, barley, oats)',
  crustaceans: 'Crustaceans',
  eggs: 'Eggs',
  fish: 'Fish',
  peanuts: 'Peanuts',
  soybeans: 'Soybeans',
  milk: 'Milk (and lactose)',
  nuts: 'Tree nuts',
  celery: 'Celery',
  mustard: 'Mustard',
  sesame: 'Sesame',
  sulphites: 'Sulphites',
  lupin: 'Lupin',
  molluscs: 'Molluscs',
};

export type Unit = 'g' | 'ml' | 'unit';
export type Form = 'fresh' | 'dried' | 'canned' | 'jarred' | 'ground' | 'cured' | 'smoked' | 'processed';

export type Product = {
  id: string;
  name: string;
  category: Category;
  form: Form;
  unit: Unit;
  aliases: string[];
  allergens: Allergen[];
  mayContain: Allergen[];
};

const UNITS = ['g', 'ml', 'unit'];
const FORMS = ['fresh', 'dried', 'canned', 'jarred', 'ground', 'cured', 'smoked', 'processed'];

// Lower case and remove accents, so "Pêra", "pera" and "PERA" all match.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function slug(text: string): string {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parse(category: Category, defaultUnit: Unit, rows: string): Product[] {
  return rows
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name, unit = '', form = '', aliases = '', allergens = '', mayContain = ''] = line
        .split('|')
        .map((part) => part.trim());
      const list = (text: string) => text.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
      const bad =
        !name ||
        (unit && !UNITS.includes(unit)) ||
        (form && !FORMS.includes(form)) ||
        [...list(allergens), ...list(mayContain)].some((a) => !(a in ALLERGEN_LABELS));
      if (bad) throw new Error(`Bad product row in catalog: "${line}"`);
      return {
        id: slug(name),
        name,
        category,
        form: (form || 'fresh') as Form,
        unit: (unit || defaultUnit) as Unit,
        aliases: list(aliases),
        allergens: list(allergens) as Allergen[],
        mayContain: list(mayContain) as Allergen[],
      };
    });
}

const vegetables = parse('vegetables', 'g', `
Tomato|g||tomate
Cherry tomato|g||tomate cherry
Onion|g||cebola
Red onion|g||cebola roxa
Spring onion|g||cebolinho;cebola nova;cebolinha
Shallot|g||chalota
Garlic|unit||alho;dente de alho
Leek|g||alho-francês;alho francês
Potato|g||batata
Sweet potato|g||batata-doce;batata doce
Carrot|g||cenoura
Celery|g||aipo|celery
Celeriac|g||aipo-rábano;aipo rábano|celery
Parsnip|g||pastinaca
Turnip|g||nabo
Turnip greens|g||grelos;nabiça
Beetroot|g||beterraba
Radish|g||rabanete
Cucumber|g||pepino
Courgette|g||curgete;abobrinha
Aubergine|g||beringela
Red pepper|g||pimento vermelho
Green pepper|g||pimento verde
Yellow pepper|g||pimento amarelo
Chilli pepper|g||piri-piri;pimenta;malagueta
Jalapeño|g||jalapeno
Broccoli|g||brócolos;brócolis
Cauliflower|g||couve-flor;couve flor
Cabbage|g||couve;repolho
Red cabbage|g||couve roxa;repolho roxo
Savoy cabbage|g||couve lombarda;lombarda
Galician kale|g||couve galega;couve-galega;couve kale
Brussels sprouts|g||couves de bruxelas
Spinach|g||espinafres;espinafre
Lettuce|g||alface
Rocket|g||rúcula;rucula
Watercress|g||agrião
Chard|g||acelga
Endive|g||endívia
Fennel|g||funcho;erva-doce
Asparagus|g||espargos
Green beans|g||feijão verde;vagens
Peas|g||ervilhas;ervilha
Fresh broad beans|g||favas;fava
Sweetcorn|g||milho;espiga de milho
Pumpkin|g||abóbora
Butternut squash|g||abóbora butternut;abóbora manteiga
Mushroom|g||cogumelos;cogumelo
Chestnut mushroom|g||cogumelo castanho
Shiitake mushroom|g||cogumelo shiitake;shiitake
Oyster mushroom|g||cogumelo ostra;pleurotus
Artichoke|g||alcachofra
Okra|g||quiabo
Ginger|g||gengibre
Turmeric root|g||açafrão-da-índia fresco;curcuma fresca
Bean sprouts|g||rebentos de soja;rebentos
Pak choi|g||pak choi
Daikon|g||rabanete japonês;daikon
Jerusalem artichoke|g||tupinambo
`);

const fruit = parse('fruit', 'g', `
Apple|unit||maçã;maca
Pear|unit||pêra;pera
Banana|unit||banana
Orange|unit||laranja
Mandarin|unit||tangerina;clementina
Lemon|unit||limão;limao
Lime|unit||lima
Grapefruit|unit||toranja
Strawberry|g||morango
Blueberry|g||mirtilo
Raspberry|g||framboesa
Blackberry|g||amora
Cherry|g||cereja
Grapes|g||uvas;uva
Peach|unit||pêssego;pessego
Nectarine|unit||nectarina
Apricot|unit||alperce;damasco
Plum|unit||ameixa
Fig|unit||figo
Pomegranate|unit||romã
Kiwi|unit||kiwi
Pineapple|unit||ananás;ananas
Mango|unit||manga
Papaya|unit||papaia
Passion fruit|unit||maracujá;maracuja
Melon|unit||melão;melao
Watermelon|g||melancia
Coconut|unit||coco
Avocado|unit||abacate
Persimmon|unit||dióspiro;diospiro
Quince|unit||marmelo
Raisins|g|dried|passas;passas de uva
Dried apricots|g|dried|alperces secos;damascos secos||sulphites
Prunes|g|dried|ameixas secas
Dried figs|g|dried|figos secos
Dried dates|g|dried|tâmaras;tamaras
Dried cranberries|g|dried|arandos secos;cranberries secas
Dried mango|g|dried|manga seca||sulphites
Dried banana|g|dried|banana seca;banana desidratada
`);

const meat = parse('meat', 'g', `
Minced beef|g||carne picada;carne de vaca picada;carne moída
Minced pork|g||carne de porco picada
Mixed minced meat|g||carne picada mista
Beef steak|g||bife;bife de vaca
Beef sirloin|g||lombo de vaca;vazia
Beef rump|g||alcatra
Beef shin|g||chambão;chambão de vaca
Beef chuck|g||acém
Beef brisket|g||peito de vaca
Beef ribs|g||costela de vaca
Beef liver|g||fígado de vaca;iscas
Beef tongue|g||língua de vaca
Oxtail|g||rabo de boi
Tripe|g||tripas;dobrada
Veal|g||vitela
Pork loin|g||lombo de porco
Pork tenderloin|g||febras;filete de porco
Pork belly|g||entremeada;barriga de porco
Pork ribs|g||entrecosto;costelas de porco
Pork shoulder|g||pá de porco
Pork chop|g||costeleta de porco
Pork cheek|g||bochechas de porco
Pork trotters|g||pézinhos de porco
Pork liver|g||fígado de porco
Chicken breast|g||peito de frango
Chicken thigh|g||coxa de frango;coxas de frango
Chicken drumstick|g||perna de frango
Chicken wings|g||asas de frango
Whole chicken|g||frango inteiro;frango;galinha
Chicken liver|g||fígado de frango
Chicken gizzards|g||moelas
Minced chicken|g||frango picado
Turkey breast|g||peito de peru
Minced turkey|g||peru picado
Duck breast|g||peito de pato
Duck leg|g||perna de pato
Whole duck|g||pato
Rabbit|g||coelho
Lamb leg|g||perna de borrego;perna de cordeiro
Lamb chops|g||costeletas de borrego;costeletas de cordeiro
Lamb shoulder|g||pá de borrego;pá de cordeiro
Kid goat|g||cabrito
Chouriço|g|cured|chouriço;chourico;chouriço de carne
Farinheira|g|cured|farinheira|gluten
Morcela|g|cured|morcela;chouriço de sangue
Linguiça|g|cured|linguiça;linguica
Paio|g|cured|paio
Salpicão|g|cured|salpicão;salpicao
Bacon|g|cured|bacon;toucinho fumado
Pancetta|g|cured|pancetta
Cured ham|g|cured|presunto
Cooked ham|g|processed|fiambre||milk,soybeans
Sausages|g|processed|salsichas;salsicha||gluten,milk
Frankfurters|g|processed|salsichas frankfurt;salsicha de frankfurt||gluten,milk
Mortadella|g|processed|mortadela||milk,soybeans
`);

const fish = parse('fish', 'g', `
Fresh cod|g||bacalhau fresco;posta de bacalhau fresco|fish
Salted cod|g|cured|bacalhau;bacalhau salgado;bacalhau seco|fish
Salmon|g||salmão;salmao|fish
Smoked salmon|g|smoked|salmão fumado|fish
Fresh tuna|g||atum fresco|fish
Sea bass|g||robalo|fish
Sea bream|g||dourada|fish
Hake|g||pescada|fish
Sardines|g||sardinhas;sardinha|fish
Mackerel|g||cavala;sarda|fish
Horse mackerel|g||carapau|fish
Swordfish|g||espadarte|fish
Monkfish|g||tamboril|fish
Sole|g||linguado|fish
Turbot|g||pregado|fish
Red mullet|g||salmonete|fish
Trout|g||truta|fish
Anchovy fillets|g|jarred|anchovas;filetes de anchova|fish
Surimi|g|processed|surimi;palitos de caranguejo|fish|gluten,crustaceans,eggs,soybeans
Octopus|g||polvo|molluscs
Squid|g||lulas;lula|molluscs
Cuttlefish|g||choco;chocos|molluscs
Mussels|g||mexilhão;mexilhões|molluscs
Clams|g||amêijoas;ameijoas|molluscs
Cockles|g||berbigão|molluscs
Oysters|g||ostras|molluscs
Scallops|g||vieiras|molluscs
Razor clams|g||lingueirão|molluscs
Prawns|g||camarão;camarões;gambas|crustaceans
Tiger prawns|g||gambas tigre;camarão tigre|crustaceans
Langoustine|g||lagostim|crustaceans
Lobster|g||lagosta|crustaceans
Crab|g||sapateira;caranguejo|crustaceans
Spider crab|g||santola|crustaceans
Goose barnacles|g||percebes|crustaceans
`);

const dairy = parse('dairy', 'g', `
Egg|unit||ovo;ovos|eggs
Egg yolk|unit||gema;gema de ovo|eggs
Egg white|unit||clara;clara de ovo|eggs
Quail eggs|unit||ovos de codorniz|eggs
Whole milk|ml||leite;leite gordo|milk
Semi-skimmed milk|ml||leite meio-gordo|milk
Skimmed milk|ml||leite magro|milk
Lactose-free milk|ml||leite sem lactose|milk
Butter|g||manteiga|milk
Margarine|g||margarina||milk,soybeans
Single cream|ml||natas;natas para cozinhar|milk
Whipping cream|ml||natas para bater;nata|milk
Sour cream|g||natas azedas;creme azedo|milk
Crème fraîche|g||creme fraiche|milk
Plain yoghurt|g||iogurte natural;iogurte|milk
Greek yoghurt|g||iogurte grego|milk
Skyr|g||skyr|milk
Kefir|ml||quefir;kefir|milk
Buttermilk|ml||leitelho|milk
Cream cheese|g||queijo creme;queijo para barrar|milk
Cottage cheese|g||queijo cottage|milk
Fresh cheese|g||queijo fresco|milk
Ricotta|g||ricotta;requeijão|milk
Mascarpone|g||mascarpone|milk
Mozzarella|g||mozzarella;mozarela|milk
Parmesan|g||parmesão;parmesao|milk
Cheddar|g||queijo cheddar;cheddar|milk
Edam|g||queijo flamengo;flamengo|milk
Emmental|g||emmental|milk
Gouda|g||queijo gouda;gouda|milk
Feta|g||queijo feta;feta|milk
Goat cheese|g||queijo de cabra|milk
Halloumi|g||halloumi|milk
Brie|g||brie|milk
Gorgonzola|g||gorgonzola|milk
Serra da Estrela cheese|g||queijo da serra|milk
São Jorge cheese|g||queijo são jorge|milk
Sliced cheese|g||queijo fatiado|milk
Grated cheese|g||queijo ralado|milk
Processed cheese|g||queijo fundido;queijinhos|milk
Condensed milk|g||leite condensado|milk
Evaporated milk|ml||leite evaporado|milk
Milk powder|g||leite em pó|milk
`);

const grains = parse('grains', 'g', `
White rice|g||arroz;arroz branco
Long-grain rice|g||arroz agulha;arroz de grão longo
Carolino rice|g||arroz carolino
Basmati rice|g||arroz basmati
Brown rice|g||arroz integral
Risotto rice|g||arroz arbóreo;arroz para risotto;arroz arborio
Wild rice|g||arroz selvagem
Spaghetti|g||esparguete|gluten
Penne|g||penne|gluten
Fusilli|g||espirais;fusilli|gluten
Macaroni|g||macarrão;massa cotovelo|gluten
Tagliatelle|g||tagliatelle;fitas|gluten
Lasagne sheets|g||folhas de lasanha;massa de lasanha|gluten
Vermicelli|g||aletria;fidelinho;massinha|gluten
Rigatoni|g||rigatoni|gluten
Farfalle|g||farfalle;laços|gluten
Egg noodles|g||noodles de ovo|gluten,eggs
Rice noodles|g||noodles de arroz;vermicelli de arroz
Udon noodles|g||udon|gluten
Soba noodles|g||soba||gluten
Gnocchi|g|processed|gnocchi;nhoque|gluten|eggs
Couscous|g||cuscuz;couscous|gluten
Bulgur|g||bulgur|gluten
Quinoa|g||quinoa
Polenta|g||polenta
Cornmeal|g||farinha de milho;fubá
Rolled oats|g||flocos de aveia;aveia|gluten
Muesli|g|processed|muesli|gluten|nuts,milk
Cornflakes|g|processed|cornflakes;flocos de milho||gluten
Barley|g||cevada|gluten
Spelt|g||espelta|gluten
Rye grain|g||centeio|gluten
Buckwheat|g||trigo-sarraceno;trigo sarraceno
Semolina|g||sêmola;semola|gluten
Tapioca|g||tapioca
Breadcrumbs|g|processed|pão ralado;pão-ralado|gluten
Bread|g|processed|pão;pao|gluten
Sliced white bread|g|processed|pão de forma|gluten||milk,soybeans
Wholemeal bread|g|processed|pão integral|gluten
Rye bread|g|processed|pão de centeio|gluten
Cornbread (broa)|g|processed|broa;broa de milho|gluten
Baguette|g|processed|baguete;cacete|gluten
Tortilla wraps|g|processed|tortilhas;wraps|gluten
Pita bread|g|processed|pão pita|gluten
Crackers|g|processed|bolachas de água e sal;crackers|gluten
Puff pastry|g|processed|massa folhada|gluten|milk
Shortcrust pastry|g|processed|massa quebrada|gluten|milk,eggs
Filo pastry|g|processed|massa filo|gluten
Pizza dough|g|processed|massa de pizza|gluten
`);

const legumes = parse('legumes', 'g', `
Chickpeas (dried)|g|dried|grão-de-bico;grão de bico
Chickpeas (canned)|g|canned|grão-de-bico cozido;grão em lata
Kidney beans (dried)|g|dried|feijão encarnado;feijão vermelho
Kidney beans (canned)|g|canned|feijão encarnado cozido;feijão vermelho em lata
Black beans (dried)|g|dried|feijão preto
Black beans (canned)|g|canned|feijão preto cozido
White beans (dried)|g|dried|feijão branco
White beans (canned)|g|canned|feijão branco cozido
Pinto beans (dried)|g|dried|feijão catarino;feijão pinto
Black-eyed peas (dried)|g|dried|feijão frade;feijão-frade
Black-eyed peas (canned)|g|canned|feijão frade cozido
Broad beans (dried)|g|dried|favas secas
Red lentils|g|dried|lentilhas vermelhas
Green lentils|g|dried|lentilhas verdes;lentilhas
Brown lentils|g|dried|lentilhas castanhas
Lentils (canned)|g|canned|lentilhas cozidas
Split peas|g|dried|ervilhas secas;ervilhas partidas
Soybeans (dried)|g|dried|soja;feijão de soja|soybeans
Edamame|g||edamame|soybeans
Tofu|g||tofu|soybeans
Tempeh|g||tempeh|soybeans
Hummus|g|processed|húmus;hummus|sesame
Lupin beans|g|jarred|tremoços;tremoço|lupin
Mung beans|g|dried|feijão mungo
Adzuki beans|g|dried|feijão azuki
`);

const herbs = parse('herbs', 'g', `
Parsley|g||salsa
Coriander|g||coentros;coentro
Basil|g||manjericão;manjericao
Mint|g||hortelã;hortela
Rosemary|g||alecrim
Thyme|g||tomilho
Fresh oregano|g||orégãos frescos;oregãos frescos
Sage|g||salva
Fresh bay leaf|unit||louro;folha de louro
Dill|g||endro
Chives|g||cebolinho francês;cebolinha francesa
Tarragon|g||estragão
Lemongrass|g||capim-limão;erva-príncipe
Kaffir lime leaves|unit||folhas de lima kaffir
Lemon balm|g||erva-cidreira
Lovage|g||levístico|celery
Marjoram|g||manjerona
Curry leaves|unit||folhas de caril
`);

const spices = parse('spices', 'g', `
Salt|g||sal
Coarse sea salt|g||sal grosso;sal marinho
Black pepper|g|ground|pimenta preta;pimenta;pimenta moída
Black peppercorns|g|dried|pimenta em grão
White pepper|g|ground|pimenta branca
Paprika|g|ground|pimentão doce;colorau;pimentão-doce
Smoked paprika|g|ground|pimentão fumado;pimentão doce fumado
Cayenne pepper|g|ground|pimenta caiena
Chilli flakes|g|dried|flocos de piri-piri;piri-piri seco;pimenta em flocos
Chilli powder|g|ground|pimenta em pó
Ground cumin|g|ground|cominhos;cominho
Cumin seeds|g|dried|sementes de cominho
Coriander seeds|g|dried|sementes de coentro;coentros em grão
Ground coriander|g|ground|coentros em pó
Turmeric|g|ground|açafrão-da-índia;curcuma;açafrão da terra
Saffron|g||açafrão
Cinnamon stick|unit|dried|pau de canela;canela em pau
Ground cinnamon|g|ground|canela;canela em pó
Nutmeg|g|ground|noz-moscada;noz moscada
Cloves|g|dried|cravinho;cravo-da-índia
Allspice|g|ground|pimenta da jamaica
Cardamom|g|dried|cardamomo
Star anise|unit|dried|anis estrelado
Fennel seeds|g|dried|sementes de funcho
Ground ginger|g|ground|gengibre em pó
Garlic powder|g|ground|alho em pó
Onion powder|g|ground|cebola em pó
Dried oregano|g|dried|orégãos;oregãos;orégão seco
Dried basil|g|dried|manjericão seco
Dried thyme|g|dried|tomilho seco
Dried rosemary|g|dried|alecrim seco
Dried parsley|g|dried|salsa seca
Dried bay leaves|unit|dried|louro seco;folhas de louro secas
Dried mint|g|dried|hortelã seca
Dried sage|g|dried|salva seca
Mixed herbs|g|dried|ervas aromáticas;ervas de provence
Curry powder|g|ground|caril;caril em pó||mustard,celery
Garam masala|g|ground|garam masala||mustard,celery
Ras el hanout|g|ground|ras el hanout
Mustard seeds|g|dried|sementes de mostarda|mustard
Mustard powder|g|ground|mostarda em pó|mustard
Vanilla pod|unit|dried|baunilha em vagem;vagem de baunilha
Sumac|g|ground|sumagre
Za'atar|g|ground|zaatar|sesame
Cajun seasoning|g|ground|tempero cajun||mustard,celery
Celery salt|g|ground|sal de aipo|celery
Celery seeds|g|dried|sementes de aipo|celery
`);

const condiments = parse('condiments', 'ml', `
Soy sauce|ml||molho de soja|soybeans,gluten
Worcestershire sauce|ml||molho inglês|fish||gluten
Fish sauce|ml||molho de peixe|fish
Oyster sauce|ml||molho de ostra|molluscs,soybeans|gluten
Hot sauce|ml||molho picante
Piri-piri sauce|ml||molho piri-piri
Sriracha|ml||sriracha
Tomato ketchup|ml||ketchup;ketchup de tomate||celery
Mayonnaise|ml||maionese|eggs|mustard
Mustard|g||mostarda|mustard
Dijon mustard|g||mostarda dijon|mustard
Wholegrain mustard|g||mostarda em grão|mustard
White wine vinegar|ml||vinagre de vinho branco|sulphites
Red wine vinegar|ml||vinagre de vinho tinto|sulphites
Balsamic vinegar|ml||vinagre balsâmico|sulphites
Apple cider vinegar|ml||vinagre de cidra
Distilled vinegar|ml||vinagre branco;vinagre de álcool;vinagre
Rice vinegar|ml||vinagre de arroz
Malt vinegar|ml||vinagre de malte|gluten
Tomato paste|g||concentrado de tomate;polpa concentrada
Tomato sauce|ml||molho de tomate;polpa de tomate
Passata|ml||passata
Pesto|g||pesto|milk,nuts
Barbecue sauce|ml||molho barbecue;molho bbq||gluten,celery,mustard
Sweet chilli sauce|ml||molho agridoce de pimenta
Teriyaki sauce|ml||molho teriyaki|soybeans,gluten|sesame
Hoisin sauce|ml||molho hoisin|soybeans,gluten|sesame,peanuts
Tahini|g||tahini;pasta de sésamo|sesame
Peanut butter|g||manteiga de amendoim|peanuts
Honey|g||mel
Maple syrup|ml||xarope de ácer
Jam|g||doce de fruta;doce;compota
Quince jelly (marmelada)|g||marmelada
Hazelnut chocolate spread|g||creme de avelã;nutella|nuts,milk|soybeans
Gherkins|g|jarred|pepinos em conserva;pickles||mustard
Capers|g|jarred|alcaparras
Olives|g|jarred|azeitonas
Green olives|g|jarred|azeitonas verdes
Black olives|g|jarred|azeitonas pretas
Stock cube (beef)|unit|processed|cubo de caldo de carne;caldo de carne em cubo|celery|gluten,milk,soybeans
Stock cube (chicken)|unit|processed|cubo de caldo de galinha;caldo de galinha em cubo|celery|gluten,milk
Stock cube (vegetable)|unit|processed|cubo de caldo de legumes|celery|gluten,soybeans
Stock cube (fish)|unit|processed|cubo de caldo de peixe|celery,fish
Beef stock|ml|processed|caldo de carne|celery
Chicken stock|ml|processed|caldo de galinha|celery
Vegetable stock|ml|processed|caldo de legumes|celery
Fish stock|ml|processed|caldo de peixe|fish,celery
Harissa|g||harissa
Miso paste|g||pasta de miso|soybeans|gluten
Thai curry paste|g||pasta de caril||crustaceans,fish
Chutney|g||chutney
Mirin|ml||mirin
`);

const oils = parse('oils', 'ml', `
Olive oil|ml||azeite
Extra virgin olive oil|ml||azeite virgem extra
Sunflower oil|ml||óleo de girassol;óleo
Vegetable oil|ml||óleo vegetal;óleo alimentar
Rapeseed oil|ml||óleo de colza
Corn oil|ml||óleo de milho
Coconut oil|g||óleo de coco
Sesame oil|ml||óleo de sésamo|sesame
Peanut oil|ml||óleo de amendoim|peanuts
Walnut oil|ml||óleo de noz|nuts
Lard|g||banha;banha de porco
Duck fat|g||gordura de pato
Ghee|g||ghee|milk
Cooking spray|ml||spray de cozinha
`);

const baking = parse('baking', 'g', `
Plain flour|g||farinha;farinha de trigo|gluten
Self-raising flour|g||farinha com fermento|gluten
Wholemeal flour|g||farinha integral|gluten
Strong bread flour|g||farinha de força;farinha para pão|gluten
Rye flour|g||farinha de centeio|gluten
Spelt flour|g||farinha de espelta|gluten
Oat flour|g||farinha de aveia|gluten
Cornflour|g||maizena;amido de milho
Rice flour|g||farinha de arroz
Chickpea flour|g||farinha de grão
Almond flour|g||farinha de amêndoa|nuts
Coconut flour|g||farinha de coco
Potato starch|g||fécula de batata
Cassava flour|g||farinha de mandioca
Lupin flour|g||farinha de tremoço|lupin
Sugar|g||açúcar;açucar;açúcar branco
Brown sugar|g||açúcar amarelo;açúcar mascavado
Icing sugar|g||açúcar em pó;açúcar glaçado
Caster sugar|g||açúcar fino
Vanilla sugar|g||açúcar baunilhado
Baking powder|g||fermento em pó;fermento químico||gluten
Bicarbonate of soda|g||bicarbonato de sódio
Dry yeast|g||fermento de padeiro seco;fermento seco
Fresh yeast|g||fermento de padeiro fresco;fermento fresco
Vanilla extract|ml||essência de baunilha;extrato de baunilha
Cocoa powder|g||cacau em pó;cacau
Dark chocolate|g||chocolate negro;chocolate preto|soybeans|milk,nuts
Milk chocolate|g||chocolate de leite|milk,soybeans|nuts
White chocolate|g||chocolate branco|milk,soybeans|nuts
Chocolate chips|g||pepitas de chocolate|soybeans|milk,nuts
Gelatine|g||gelatina;folhas de gelatina
Agar-agar|g||agar-agar
Custard powder|g||pó para pudim;creme de pasteleiro em pó||milk
Marzipan|g||maçapão|nuts
Sprinkles|g||granulado;açúcar colorido
Food colouring|ml||corante alimentar
Glucose syrup|g||xarope de glucose
Molasses|ml||melaço de cana
Maria biscuits|g|processed|bolachas maria|gluten|milk,soybeans,eggs
Ladyfingers|g|processed|biscoitos de champanhe;palitos de champanhe|gluten,eggs
`);

const canned = parse('canned', 'g', `
Canned tomatoes|g|canned|tomate pelado;tomate em lata;tomate pelado em lata
Chopped tomatoes|g|canned|tomate picado;tomate em cubos
Canned tuna in oil|g|canned|atum em óleo;atum em lata|fish
Canned tuna in water|g|canned|atum ao natural|fish
Canned sardines|g|canned|sardinhas em lata;sardinhas em conserva|fish
Canned mackerel|g|canned|cavala em lata;cavala em conserva|fish
Canned octopus|g|canned|polvo em conserva|molluscs
Canned mussels|g|canned|mexilhões em conserva|molluscs
Canned sweetcorn|g|canned|milho em lata;milho doce
Canned peas|g|canned|ervilhas em lata
Canned mushrooms|g|canned|cogumelos em lata
Canned pineapple|g|canned|ananás em lata
Canned peaches|g|canned|pêssego em calda||sulphites
Canned asparagus|g|canned|espargos em lata
Canned beetroot|g|canned|beterraba em conserva
Canned bamboo shoots|g|canned|rebentos de bambu
Coconut milk|ml|canned|leite de coco
Coconut cream|ml|canned|natas de coco
Roasted red peppers|g|jarred|pimentos assados;pimentos em conserva
Artichoke hearts|g|jarred|corações de alcachofra
Sun-dried tomatoes|g|jarred|tomate seco
Baked beans|g|canned|feijão cozido em molho;baked beans
Canned soup|g|canned|sopa em lata||celery,gluten,milk
`);

const nuts = parse('nuts', 'g', `
Almonds|g||amêndoas;amêndoa|nuts
Walnuts|g||nozes;noz|nuts
Hazelnuts|g||avelãs;avelã|nuts
Cashews|g||castanhas de caju;caju|nuts
Pistachios|g||pistáchios;pistácios|nuts
Pecans|g||nozes-pecã;noz pecã|nuts
Brazil nuts|g||castanhas do pará|nuts
Macadamia nuts|g||macadâmia|nuts
Pine nuts|g||pinhões;pinhão||nuts
Chestnuts|g||castanhas;castanha
Peanuts|g||amendoins;amendoim|peanuts
Sesame seeds|g||sementes de sésamo;sésamo|sesame
Sunflower seeds|g||sementes de girassol
Pumpkin seeds|g||sementes de abóbora
Chia seeds|g||sementes de chia;chia
Flaxseed|g||linhaça;sementes de linhaça
Poppy seeds|g||sementes de papoila;papoila
Hemp seeds|g||sementes de cânhamo
Flaked almonds|g||amêndoa laminada|nuts
Ground almonds|g||amêndoa em pó;amêndoa moída|nuts
Desiccated coconut|g||coco ralado
Mixed nuts|g||frutos secos;frutos secos variados|nuts,peanuts
`);

const drinks = parse('drinks', 'ml', `
Water|ml||água;agua
Sparkling water|ml||água com gás;água gaseificada
Orange juice|ml||sumo de laranja
Apple juice|ml||sumo de maçã
Lemon juice|ml||sumo de limão
Lime juice|ml||sumo de lima
Tomato juice|ml||sumo de tomate||celery
Coconut water|ml||água de coco
Coffee|ml||café;expresso
Tea|g||chá
Green tea|g||chá verde
Black tea|g||chá preto
Camomile tea|g||chá de camomila;camomila
Hot chocolate mix|g||chocolate em pó;cacau instantâneo|milk,soybeans|nuts
Oat milk|ml||leite de aveia|gluten
Soy milk|ml||leite de soja|soybeans
Almond milk|ml||leite de amêndoa|nuts
Rice milk|ml||leite de arroz
Red wine|ml||vinho tinto|sulphites
White wine|ml||vinho branco|sulphites
Port wine|ml||vinho do porto|sulphites
Madeira wine|ml||vinho da madeira|sulphites
Sparkling wine|ml||espumante|sulphites
Beer|ml||cerveja|gluten
Cider|ml||sidra||sulphites
Brandy|ml||brandy;aguardente
Rum|ml||rum
Whisky|ml||whisky
`);

export const PRODUCTS: Product[] = [
  ...vegetables,
  ...fruit,
  ...meat,
  ...fish,
  ...dairy,
  ...grains,
  ...legumes,
  ...herbs,
  ...spices,
  ...condiments,
  ...oils,
  ...baking,
  ...canned,
  ...nuts,
  ...drinks,
];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: string | null | undefined): Product | undefined {
  return id ? BY_ID.get(id) : undefined;
}

// Search names are prepared once, when the app starts.
const INDEX = PRODUCTS.map((product) => ({
  product,
  name: normalize(product.name),
  aliases: product.aliases.map(normalize),
}));

// Suggestions as you type, best matches first:
//   1. the text is exactly a name or alias ("arroz" -> White rice)
//   2. a name starts with it, then an alias starts with it
//   3. a name contains it, then an alias contains it (only from 2 letters up)
// Maximum 8 suggestions by default.
export function searchProducts(text: string, limit = 8): Product[] {
  const q = normalize(text);
  if (!q) return [];
  const scored: { product: Product; score: number }[] = [];
  for (const entry of INDEX) {
    let score = -1;
    if (entry.name === q || entry.aliases.includes(q)) score = 0;
    else if (entry.name.startsWith(q)) score = 1;
    else if (entry.aliases.some((a) => a.startsWith(q))) score = 2;
    else if (q.length >= 2 && entry.name.includes(q)) score = 3;
    else if (q.length >= 2 && entry.aliases.some((a) => a.includes(q))) score = 4;
    if (score >= 0) scored.push({ product: entry.product, score });
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      a.product.name.length - b.product.name.length ||
      a.product.name.localeCompare(b.product.name),
  );
  return scored.slice(0, limit).map((s) => s.product);
}
