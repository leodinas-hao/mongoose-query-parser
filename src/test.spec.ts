import { suite, test } from "mocha-typescript";
import { assert } from "chai";

import { MongooseQueryParser } from "./";

@suite('Tester')
class Tester {
  @test('should parse general query')
  generalParse() {
    let parser = new MongooseQueryParser();
    let qry = 'date=2016-01-01&boolean=true&integer=10&regexp=/foobar/i&null=null';
    let parsed = parser.parse(qry);
    assert.isNotNull(parsed.filter);
    assert.isOk(parsed.filter.date instanceof Date);
    assert.isOk(parsed.filter.boolean === true);
    assert.isOk(parsed.filter.integer === 10);
    assert.isOk(parsed.filter.regexp instanceof RegExp);
    assert.isOk(parsed.filter.null === null);
  }

  @test('should parse populate query')
  async populateParse() {
    let parser = new MongooseQueryParser();
    let qry = '_id=1&populate=serviceSalesOrders,customer.category,customer.name';
    let parsed = parser.parse(qry);
    assert.isOk((parsed.populate as any).length === 2);
  }

  @test('should parse caster')
  parseCaster() {
    let parser = new MongooseQueryParser({ casters: { $: val => '$' + val } });
    let qry = '_id=$(1)';
    let parsed = parser.parse(qry);
    assert.equal('$1', parsed.filter._id);
  }

  @test('should parse json filter')
  parseJsonFilter() {
    let parser = new MongooseQueryParser();
    let obj = {
      $or: [
        { key1: 'value1' },
        { key2: 'value2' }
      ]
    }
    let qry = `filter=${JSON.stringify(obj)}&name=Google`;
    let parsed = parser.parse(qry);
    assert.isArray(parsed.filter.$or);
    assert.isOk(parsed.filter.name === 'Google');
  }

  @test('should parse predefined query objects')
  parsePredefined() {
    let parser = new MongooseQueryParser();
    let preDefined = {
      isActive: { status: { $in: ['In Progress', 'Pending'] } },
      vip: ['KFC', 'Google', 'MS'],
      secret: 'my_secret',
      mykey: 'realkey'
    };
    // test predefined query as key
    let qry = '${isActive}&name&${mykey}=1';
    let parsed = parser.parse(qry, preDefined);
    assert.isNotNull(parsed.filter.status);
    assert.isOk(!parsed.filter['${isActive}']);
    assert.isOk(parsed.filter['realkey'] === 1);
    // test predefined query as value
    qry = 'secret=${secret}';
    parsed = parser.parse(qry, preDefined);
    assert.isOk(parsed.filter.secret === preDefined.secret);
    // test predefined query in json
    qry = 'filter={"$and": ["${isActive}", {"customer": "VDF"}]}';
    parsed = parser.parse(qry, preDefined);
    assert.isNotNull(parsed.filter.$and[0].status);
  }
}