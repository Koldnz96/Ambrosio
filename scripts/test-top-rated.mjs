import { topRated, newest } from '../src/data/top-rated.ts';

let fails = 0;
const check = (label, ok) => { console.log(ok ? 'PASS' : 'FAIL', label); if (!ok) fails++; };
const r = (id, createdAtMs, name = id) => ({ id, createdAtMs, name });
const item = (recipe, average, count) => ({ recipe, average, count });
const key = (x) => x.name;
const ids = (list) => list.map((i) => (i.recipe ? i.recipe.id : i.id)).join(',');

const list = [
  item(r('a', 1), 4.0, 2),
  item(r('b', 2), 5.0, 1),
  item(r('c', 3), 4.5, 10),
  item(r('d', 4), null, 0),
  item(r('e', 5), 4.5, 3),
];
check('best average first, unrated left out', ids(topRated(list, 3, key)) === 'b,c,e');
check('limit works', topRated(list, 2, key).length === 2);
check('tie on average: more ratings first', ids(topRated(list, 10, key)) === 'b,c,e,a');
check('tie on both: newest first', ids(topRated([item(r('x', 1), 4, 2), item(r('y', 9), 4, 2)], 2, key)) === 'y,x');
check('same dish only once', ids(topRated([item(r('p', 1, 'same'), 5, 1), item(r('q', 2, 'same'), 4, 9)], 3, key)) === 'p');
check('nothing rated -> empty', topRated([item(r('z', 1), null, 0)], 3, key).length === 0);
check('empty list -> empty', topRated([], 3, key).length === 0);
const input = [...list];
topRated(input, 3, key);
check('does not change the original list', ids(input) === ids(list));

const rec = [r('1', 10), r('2', 30), r('3', 20), r('4', 40, 'dup'), r('5', 5, 'dup')];
check('newest first', newest(rec, 3, (x) => x.id).map((x) => x.id).join(',') === '4,2,3');
check('newest skips the same dish twice', newest(rec, 5, key).map((x) => x.id).join(',') === '4,2,3,1');
check('newest on empty list', newest([], 3, key).length === 0);
process.exit(fails ? 1 : 0);
