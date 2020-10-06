# mongoose-query-parser

[![NPM version][npm-image]][npm-url]
[![Downloads][download-badge]][npm-url]

Convert url query string to MongooseJs friendly query object including advanced filtering, sorting, population, string template, type casting and many more...

The library is built highly inspired by [api-query-params](https://github.com/loris/api-query-params)

## Features

- Supports the most of MongoDB operators (`$in`, `$regexp`, `$exists`) and features including skip, sort, limit & MongooseJS population
- Auto type casting of `Number`, `RegExp`, `Date`, `Boolean` and `null`
- String templates/predefined queries (i.e. `firstName=${my_vip_list}`)
- Allows customization of keys and options in query string

## Installation
```
npm install mongoose-query-parser --save
```

## Usage

### API
```
import { MongooseQueryParser } from 'mongoose-query-parser';

const parser = new MongooseQueryParser(options?: ParserOptions)
parser.parse(query: string, predefined: any) : QueryOptions
```

##### Arguments
- `ParserOptions`: object for advanced options (See below) [optional]
- `query`: query string part of the requested API URL (ie, `firstName=John&limit=10`). Works with already parsed object too (ie, `{status: 'success'}`) [required]
- `predefined`: object for predefined queries/string templates [optional]

#### Returns
- `QueryOptions`: object contains the following properties:
    - `filter` which contains the query criteria
    - `populate` which contains the query population. Please see [Mongoose Populate](http://mongoosejs.com/docs/populate.html) for more details
    - `select` which contains the query projection
    - `sort`, `skip`, `limit` which contains the cursor modifiers for paging purpose

### Example
```js
import { MongooseQueryParser } from 'mongoose-query-parser';

const parser = new MongooseQueryParser();
const predefined = {
  vip: { name: { $in: ['Google', 'Microsoft', 'NodeJs'] } },
  sentStatus: 'sent'
};
const parsed = parser.parse('${vip}&status=${sentStatus}&timestamp>2017-10-01&author.firstName=/john/i&limit=100&skip=50&sort=-timestamp&select=name&populate=children.firstName,children.lastName', predefined);
{
  select: { name : 1 },
  populate: [{ path: 'children', select: 'firstName lastName' }],
  sort: { timestamp: -1 },
  skip: 50,
  limit: 100,
  filter: {
    name: {{ $in: ['Google', 'Microsoft', 'NodeJs'] }},
    status: 'sent',
    timestamp: { '$gt': 2017-09-30T14:00:00.000Z },
    'author.firstName': /john/i
  }
}

```


## Supported features

#### Filtering operators

| MongoDB   | URI                  | Example                 | Result                                                   |
| --------- | -------------------- | ----------------------- | -------------------------------------------------------- |
| `$eq`     | `key=val`            | `type=public`           | `{filter: {type: 'public'}}`                             |
| `$gt`     | `key>val`            | `count>5`               | `{filter: {count: {$gt: 5}}}`                            |
| `$gte`    | `key>=val`           | `rating>=9.5`           | `{filter: {rating: {$gte: 9.5}}}`                        |
| `$lt`     | `key<val`            | `createdAt<2017-10-01`  | `{filter: {createdAt: {$lt: 2017-09-30T14:00:00.000Z}}}` |
| `$lte`    | `key<=val`           | `score<=-5`             | `{filter: {score: {$lte: -5}}}`                          |
| `$ne`     | `key!=val`           | `status!=success`       | `{filter: {status: {$ne: 'success'}}}`                   |
| `$in`     | `key=val1,val2`      | `country=GB,US`         | `{filter: {country: {$in: ['GB', 'US']}}}`               |
| `$nin`    | `key!=val1,val2`     | `lang!=fr,en`           | `{filter: {lang: {$nin: ['fr', 'en']}}}`                 |
| `$exists` | `key`                | `phone`                 | `{filter: {phone: {$exists: true}}}`                     |
| `$exists` | `!key`               | `!email`                | `{filter: {email: {$exists: false}}}`                    |
| `$regex`  | `key=/value/<opts>`  | `email=/@gmail\.com$/i` | `{filter: {email: /@gmail.com$/i}}`                      |
| `$regex`  | `key!=/value/<opts>` | `phone!=/^06/`          | `{filter: {phone: { $not: /^06/}}}`                      |

For more advanced usage (`$or`, `$type`, `$elemMatch`, etc.), pass any MongoDB query filter object as JSON string in the `filter` query parameter, ie:

```js
parser.parse('filter={"$or":[{"key1":"value1"},{"key2":"value2"}]}&name=Telstra');
// {
//   filter: {
//     $or: [
//       { key1: 'value1' },
//       { key2: 'value2' }
//     ],
//     name: 'Telstra'
//   },
// }
```

#### Populate operators

- Useful to populate sub-document(s) in query. Works with `MongooseJS`. Please see [Mongoose Populate](http://mongoosejs.com/docs/populate.html) for more details
- Allows to populate only selected fields
- Default operator key is `populate`

```js
parser.parse('populate=class,school.name');
// {
//   populate: [{
//     path: 'class'
//   }, {
//     path: 'school',
//     select: 'name'
//   }]
// }
```

#### Skip / Limit operators

- Useful to limit the number of records returned
- Default operator keys are `skip` and `limit`

```js
parser.parse('skip=5&limit=10');
// {
//   skip: 5,
//   limit: 10
// }
```

#### Select operator

- Useful to limit fields to return in each records
- Default operator key is `select`
- It accepts a comma-separated list of fields. Default behavior is to specify fields to return. Use `-` prefixes to return all fields except some specific fields
- Due to a MongoDB limitation, you cannot combine inclusion and exclusion semantics in a single projection with the exception of the _id field

```js
parser.parse('select=id,url');
// {
//   select: { id: 1, url: 1}
// }
```

```js
parser.parse('select=-_id,-email');
// {
//   select: { _id: 0, email: 0 }
// }
```

#### Sort operator

- Useful to sort returned records
- Default operator key is `sort`
- It accepts a comma-separated list of fields. Default behavior is to sort in ascending order. Use `-` prefixes to sort in descending order

```js
parser.parse('sort=-points,createdAt');
//  {
//    sort: { points: -1, createdAt: 1 }
//  }
```

#### Keys with multiple values

Any operators which process a list of fields (`$in`, `$nin`, sort and projection) can accept a comma-separated string or multiple pairs of key/value:

- `country=GB,US` is equivalent to `country=GB&country=US`
- `sort=-createdAt,lastName` is equivalent to `sort=-createdAt&sort=lastName`

#### Embedded documents using `.` notation

Any operators can be applied on deep properties using `.` notation:

```js
parser.parse('followers[0].id=123&sort=-metadata.created_at');
// {
//   filter: {
//     'followers[0].id': 123,
//   },
//   sort: { 'metadata.created_at': -1 }
// }
```

#### Automatic type casting

The following types are automatically casted: `Number`, `RegExp`, `Date`, `Boolean` and `null` string is also casted:

```js
parser.parse('date=2017-10-01&boolean=true&integer=10&regexp=/foobar/i&null=null');
// {
//   filter: {
//     date: 2017-09-30T14:00:00.000Z,
//     boolean: true,
//     integer: 10,
//     regexp: /foobar/i,
//     null: null
//   }
// }
```

If you need to disable or force type casting, you can wrap the values with `string()`, `date()` built-in casters or by specifying your own custom functions (See below):

```js
parser.parse('key1=string(10)&key2=date(2017-10-01)&key3=string(null)');
// {
//   filter: {
//     key1: '10',
//     key2: 2017-09-30T14:00:00.000Z,
//     key3: 'null'
//   }
// }
```

## String template for predefined query/variable

Best to reducing the complexity/length of the query string with the ES template literal delimiter as an "interpolate" delimiter (i.e. `${something}`)

```js
const parser = new MongooseQueryParser();
const preDefined = {
  isActive: { status: { $in: ['In Progress', 'Pending'] } },
  secret: 'my_secret'
};
parser.parse('${isActive}&secret=${secret}', preDefined);
// {
//   filter: {
//     status: { $in: ['In Progress', 'Pending'] },
//     secret: 'my_secret'
//   }
// }
```

## Available options (`opts`)

#### Customize operator keys

The following options are useful to change the operator default keys:

- `populateKey`: custom populate operator key (default is `populate`)
- `skipKey`: custom skip operator key (default is `skip`)
- `limitKey`: custom limit operator key (default is `limit`)
- `selectKey`: custom select operator key (default is `select`)
- `sortKey`: custom sort operator key (default is `sort`)
- `filterKey`: custom filter operator key (default is `filter`)

```js
const parser = new MongooseQueryParser({
  limitKey: 'max',
  skipKey: 'offset'
});
parser.parse('organizationId=123&offset=10&max=125');
// {
//   filter: {
//     organizationId: 123,
//   },
//   skip: 10,
//   limit: 125
// }
```

#### Date format
- `dateFormat`: set date format for auto date casting. Default is ISO_8601 format if no custom datetime format provided
- Allows multiple formats. Works with [luxon](https://github.com/moment/luxon)
- For the supported format tokens, please refer to [luxon document](https://moment.github.io/luxon/docs/manual/parsing.html#table-of-tokens)

```js
const parser = new MongooseQueryParser({dateFormat: ['yyyyMMdd', 'yyyy-MM-dd']});
parser.parse('date1=20171001&date2=2017-10-01');
// {
//   filter: {
//     date1: 2017-09-30T14:00:00.000Z
//     date2: 2017-09-30T14:00:00.000Z
//   }
// }
```

#### Blacklist

The following options are useful to specify which keys to use in the `filter` object. (ie, avoid that authentication parameter like `apiKey` ends up in a mongoDB query). All operator keys are (`sort`, `limit`, etc.) already ignored.

- `blacklist`: filter on all keys except the ones specified

```js
const parser = new MongooseQueryParser({ blacklist: ['apiKey'] });
parser.parse('id=e9117e5c-c405-489b-9c12-d9f398c7a112&apiKey=foobar');
// {
//   filter: {
//     id: 'e9117e5c-c405-489b-9c12-d9f398c7a112',
//   }
// }
```

#### Add custom casting functions

You can specify you own casting functions to apply to query parameter values, either by explicitly wrapping the value in URL with your custom function name (See example below) or by implicitly mapping a key to a function

- `casters`: object to specify custom casters, key is the caster name, and value is a function which is passed the query parameter value as parameter.

```js
const parser = new MongooseQueryParser({
  casters: {
    lowercase: val => val.toLowerCase(),
    int: val => parseInt(val, 10),
  },
  castParams: {
   key3: 'lowercase' 
  }});
parser.parse('key1=lowercase(VALUE)&key2=int(10.5)&key3=ABC');
// {
//   filter: {
//     key1: 'value',
//     key2: 10,
//     key3: 'abc'
//   }
// }
```

## License
MIT

[npm-url]: https://www.npmjs.com/package/mongoose-query-parser
[npm-image]: https://img.shields.io/npm/v/mongoose-query-parser.svg?style=flat-square
[download-badge]: https://img.shields.io/npm/dm/mongoose-query-parser.svg?style=flat-square 