import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';

import { MongooseQueryParser } from './';

@suite('Tester')
class Tester {
  @test('should parse general query')
  generalParse() {
    let parser = new MongooseQueryParser();
    let qry = 'date=2016-01-01&boolean=true&integer=10&regexp=/foobar/i&null=null';
    let parsed = parser.parse(qry);
    assert.isNotNull(parsed.filter);
    assert.isOk(parsed.filter['date'] instanceof Date);
    assert.isOk(parsed.filter['boolean'] === true);
    assert.isOk(parsed.filter['integer'] === 10);
    assert.isOk(parsed.filter['regexp'] instanceof RegExp);
    assert.isOk(parsed.filter['null'] === null);
  }

  @test('should parse query with string templates')
  generalParse2() {
    const parser = new MongooseQueryParser();
    const predefined = {
      vip: { name: { $in: ['Google', 'Microsoft', 'NodeJs'] } },
      sentStatus: 'sent'
    };
    const parsed = parser.parse('${vip}&status=${sentStatus}&timestamp>2017-10-01&author.firstName=/john/i&limit=100&skip=50&sort=-timestamp&select=name&populate=children', predefined);
    assert.isOk(parsed.filter['status'] === predefined.sentStatus);
    assert.isOk(parsed.filter['name'].$in.length === 3);  // checking parsing of ${vip}
    assert.isOk(parsed.filter['timestamp']['$gt'] instanceof Date);
    assert.isOk(parsed.filter['author.firstName'] instanceof RegExp);
    assert.isOk(parsed.limit === 100);
    assert.isOk(parsed.skip === 50);
    assert.isNotNull(parsed.sort);
    assert.isNotNull(parsed.select);
    assert.isNotNull(parsed.populate);
  }

  @test('should parse populate query')
  async populateParse() {
    let parser = new MongooseQueryParser();
    let qry = '_id=1&populate=serviceSalesOrders,customer.category,customer.name';
    let parsed = parser.parse(qry);
    assert.isOk((parsed.populate as any).length === 2);
  }

  @test('should parse built in casters')
  builtInCastersTest() {
    let parser = new MongooseQueryParser();
    let qry = 'key1=string(10)&key2=date(2017-10-01)&key3=string(null)';
    let parsed = parser.parse(qry);
    assert.isOk(typeof parsed.filter['key1'] === 'string');
    assert.isOk(parsed.filter['key2'] instanceof Date);
    assert.isOk(typeof parsed.filter['key3'] === 'string');
  }

  @test('should parse custom caster')
  parseCaster() {
    let parser = new MongooseQueryParser({ casters: { $: val => '$' + val } });
    let qry = '_id=$(1)';
    let parsed = parser.parse(qry);
    assert.equal('$1', parsed.filter['_id']);
  }

  @test('should parse json filter')
  parseJsonFilter() {
    let parser = new MongooseQueryParser();
    let obj = {
      $or: [
        { key1: 'value1' },
        { key2: 'value2' }
      ]
    };
    let qry = `filter=${JSON.stringify(obj)}&name=Google`;
    let parsed = parser.parse(qry);
    assert.isArray(parsed.filter['$or']);
    assert.isOk(parsed.filter['name'] === 'Google');
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
    assert.isNotNull(parsed.filter['status']);
    assert.isOk(!parsed.filter['${isActive}']);
    assert.isOk(parsed.filter['realkey'] === 1);
    // test predefined query as value
    qry = 'secret=${secret}';
    parsed = parser.parse(qry, preDefined);
    assert.isOk(parsed.filter['secret'] === preDefined.secret);
    // test predefined query in json
    qry = 'filter={"$and": ["${isActive}", {"customer": "VDF"}]}';
    parsed = parser.parse(qry, preDefined);
    assert.isNotNull(parsed.filter['$and'][0].status);
  }
}
