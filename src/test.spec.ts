import { suite, test } from '@testdeck/mocha';
import { assert } from 'chai';

import { MongooseQueryParser } from './';

@suite('test.spec')
class Tester {
  @test('should parse general query')
  generalParse() {
    const parser = new MongooseQueryParser();
    const qry = 'date=2016-01-01&boolean=true&integer=10&regexp=/foobar/i&null=null&!notexists';
    const parsed = parser.parse(qry);
    assert.isNotNull(parsed.filter);
    assert.isOk(parsed.filter['date'] instanceof Date);
    assert.isOk(parsed.filter['boolean'] === true);
    assert.isOk(parsed.filter['integer'] === 10);
    assert.isOk(parsed.filter['regexp'] instanceof RegExp);
    assert.isOk(parsed.filter['null'] === null);
    assert.isFalse(parsed.filter['notexists']['$exists']);
  }

  @test('should not show black listed property in filter')
  blacklistTest() {
    const parser = new MongooseQueryParser({ blacklist: ['apiKey'] });
    const qry = `id=some-id-here&apiKey=e9117e5c-c405-489b-9c12-d9f398c7a112`;
    const parsed = parser.parse(qry);
    assert.exists(parsed.filter);
    assert.notExists(parsed.filter.apiKey);
  }

  @test('should not show black listed property in parsed object filter query')
  parsedObjectBlacklistTest() {
    const parser = new MongooseQueryParser({ blacklist: ['apiKey'] });
    const qry = {
      filter: '{"apiKey":"e9117e5c-c405-489b-9c12-d9f398c7a112"}'
    };
    const parsed = parser.parse(qry);
    assert.exists(parsed.filter);
    assert.notExists(parsed.filter.apiKey);
  }

  @test('should not show black listed property in JSON filter query')
  jsonFilterBlcaklistTest() {
    const options = { blacklist: ['key1', 'key3'] };
    const parser = new MongooseQueryParser(options);
    const obj = {
      $or: [
        { key1: 'value1' },
        { key2: { $in: ['key3', 'key2'] } },
        { key3: 'value3' }
      ]
    };
    const qry = `filter=${JSON.stringify(obj)}&name=Google`;
    const parsed = parser.parse(qry);
    assert.isArray(parsed.filter['$or']);
    assert.isOk(parsed.filter['name'] === 'Google');
    assert.isNotOk(parsed.filter['$or'].some(obj => {
      options.blacklist.forEach(key => obj.hasOwnProperty(key));
    }));
  }

  @test('should parse dates with custom formats')
  customDateFormatParse() {
    const parser = new MongooseQueryParser({ dateFormat: ['yyyyMMdd', 'yyyy-MM-dd'] });
    const qry = `d1=date(20201001)&d2=2020-01-01&d3=09:20&d4=2020`;
    const parsed = parser.parse(qry);
    assert.exists(parsed.filter);
    assert.isTrue(parsed.filter.d1 instanceof Date);
    assert.isTrue(parsed.filter.d2 instanceof Date);
    assert.isNotTrue(parsed.filter.d3 instanceof Date);
    assert.isTrue(typeof parsed.filter.d4 === 'number');
  }

  @test('should parse dates')
  dateParse() {
    const parser = new MongooseQueryParser();
    const qry = `d1=2020-10-01&d2=2020-01&d3=09:20&d4=2020`;
    const parsed = parser.parse(qry);
    assert.exists(parsed.filter);
    assert.isTrue(parsed.filter.d1 instanceof Date);
    assert.isTrue(parsed.filter.d2 instanceof Date);
    assert.isTrue(parsed.filter.d3 instanceof Date);
    assert.isTrue(typeof parsed.filter.d4 === 'number');
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
    assert.deepEqual(parsed.sort, { timestamp: -1 });
    assert.deepEqual(parsed.select, { name: 1});
    assert.deepEqual([{ path: 'children' }], parsed.populate);
  }

  @test('should parse populate query')
  populateParse() {
    const parser = new MongooseQueryParser();
    const qry = '_id=1&populate=serviceSalesOrders,customer.category,customer.name';
    const parsed = parser.parse(qry);
    assert.isOk((parsed.populate as any).length === 2);
  }

  @test('should parse deep populate')
  deepPopulateParse() {
    const parser = new MongooseQueryParser();
    const qry = '_id=1&populate=p1,p2:p3.p4,p2:p3:p5,p6:p7';
    const parsed = parser.parse(qry);
    assert.isNotEmpty(parsed.populate);
    assert.isTrue(parsed.populate.length === 3);
    for (const p of parsed.populate) {
      if (p.path === 'p2') {
        assert.isTrue(p.populate.path === 'p3');
        assert.isTrue(p.populate.select.includes('p4'));
        assert.isTrue(p.populate.populate.path === 'p5');
      }
      if (p.path === 'p6') {
        assert.isTrue(p.populate.path === 'p7');
      }
    }
  }

  @test('should parse built in casters')
  builtInCastersTest() {
    const parser = new MongooseQueryParser();
    const qry = 'key1=string(10)&key2=date(2017-10-01)&key3=string(null)';
    const parsed = parser.parse(qry);
    assert.isOk(typeof parsed.filter['key1'] === 'string');
    assert.isOk(parsed.filter['key2'] instanceof Date);
    assert.isOk(typeof parsed.filter['key3'] === 'string');
  }

  @test('should parse custom caster')
  parseCaster() {
    const parser = new MongooseQueryParser({ casters: { $: val => '$' + val } });
    const qry = '_id=$(1)';
    const parsed = parser.parse(qry);
    assert.equal('$1', parsed.filter['_id']);
  }

  @test('should parse json filter')
  parseJsonFilter() {
    const parser = new MongooseQueryParser();
    const obj = {
      $or: [
        { key1: 'value1' },
        { key2: 'value2' }
      ]
    };
    const qry = `filter=${JSON.stringify(obj)}&name=Google`;
    const parsed = parser.parse(qry);
    assert.isArray(parsed.filter['$or']);
    assert.isOk(parsed.filter['name'] === 'Google');
  }

  @test('should parse predefined query objects')
  parsePredefined() {
    const parser = new MongooseQueryParser();
    const preDefined = {
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
    assert.deepEqual(parsed.filter['$and'][0], {
      status: { $in: ['In Progress', 'Pending'] }
    });
    assert.deepEqual(parsed.filter['$and'][1], { customer: 'VDF' });
  }
}
