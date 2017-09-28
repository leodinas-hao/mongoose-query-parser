# mongoose-query-parser

[![NPM version][npm-image]][npm-url]

Convert url query string to MongooseJs friendly query object including advanced filtering, sorting, population, string template, type casting and many more...

The library is built highly inspired by [api-query-params](https://github.com/loris/api-query-params)

## Features

- **Powerful**. Supports most of MongoDB operators (`$in`, `$regexp`, …) and features (paging, projection, population, type casting,  string templates…)
- **Custom**. Allows customization of keys (ie, `fields` v.s. `select`) and options
- **Agnostic.** Works with any web frameworks (Express …) and/or Mongoose/MongoDb libraries

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
- `predefined`: object for predefined query context [optional]

#### Returns
- `QueryOptions`: object contains the following properties:
    - `filter` which contains the query criteria
    - `populate` which contains the query population. Please see [Mongoose Populate](http://mongoosejs.com/docs/populate.html) for more details
    - `select` which contains the query projection
    - `sort`, `skip`, `limit` which contains the cursor modifiers for paging purpose

### Example
```
import { MongooseQueryParser } from 'mongoose-query-parser';

const parser = new MongooseQueryParser();
const predefined = {
  vip: { name: { $in: ['Google', 'Microsoft', 'NodeJs'] } }
  sentStatus: 'sent'
};
const query = parser.parse('${vip}&status=${sentStatus}&timestamp>2017-10-01&author.firstName=/john/i&limit=100&skip=50&sort=-timestamp&select=name&populate=children', predefined);
{
  filter: {
    { name: { $in: ['Google', 'Microsoft', 'NodeJs'] } },
    status: 'sent',
    timestamp: { $gt: Fri Jan 01 2017 01:00:00 GMT+0100 (CET) },
    'author.firstName': /john/i
  },
  sort: { timestamp: -1 },
  skip: 50,
  limit: 100,
  select: { name },
  populate: [{ path: 'children'}]
}

```


## Supported features

#### Filtering operators

| MongoDB | URI | Example | Result |
| ------- | --- | ------- | ------ |
| `$eq` | `key=val` | `type=public` | `{filter: {type: 'public'}}` |
| `$gt` | `key>val` | `count>5` | `{filter: {count: {$gt: 5}}}` |
| `$gte` | `key>=val` | `rating>=9.5` | `{filter: {rating: {$gte: 9.5}}}` |
| `$lt` | `key<val` | `createdAt<2016-01-01` | `{filter: {createdAt: {$lt: Fri Jan 01 2016 01:00:00 GMT+0100 (CET)}}}` |
| `$lte` | `key<=val` | `score<=-5` | `{filter: {score: {$lte: -5}}}` |
| `$ne` | `key!=val` | `status!=success` | `{filter: {status: {$ne: 'success'}}}` |
| `$in` | `key=val1,val2` | `country=GB,US` | `{filter: {country: {$in: ['GB', 'US']}}}` |
| `$nin` | `key!=val1,val2` | `lang!=fr,en` | `{filter: {lang: {$nin: ['fr', 'en']}}}` |
| `$exists` | `key` | `phone` | `{filter: {phone: {$exists: true}}}` |
| `$exists` | `!key` | `!email` | `{filter: {email: {$exists: false}}}` |
| `$regex` | `key=/value/<opts>` | `email=/@gmail\.com$/i` | `{filter: {email: /@gmail.com$/i}}` |
| `$regex` | `key!=/value/<opts>` | `phone!=/^06/` | `{filter: {phone: { $not: /^06/}}}` |

For more advanced usage (`$or`, `$type`, `$elemMatch`, etc.), pass any MongoDB query filter object as JSON string in the `filter` query parameter, ie:

```js
parser.parse('filter={"$or":[{"key1":"value1"},{"key2":"value2"}]}');
//  {
//    filter: {
//      $or: [
//        { key1: 'value1' },
//        { key2: 'value2' }
//      ]
//    },
//  }
```

[npm-url]: https://www.npmjs.com/package/mongoose-query-parser
[npm-image]: https://img.shields.io/npm/v/mongoose-query-parser.svg?style=flat-square
