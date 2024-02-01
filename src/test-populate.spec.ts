import { suite, test } from '@testdeck/mocha';
import { assert } from 'chai';
import * as Mongoose from 'mongoose';
import {MongoMemoryServer} from 'mongodb-memory-server';

import { MongooseQueryParser } from './';


@suite('test-populate.spec')
class PopulateTester {

  static server: MongoMemoryServer;
  static conn: Mongoose.Connection;
  static User: Mongoose.Model<any, any>;
  static Post: Mongoose.Model<any, any>;

  static async connect() {
    if (!PopulateTester.server) {
      PopulateTester.server = await MongoMemoryServer.create();
      PopulateTester.conn = Mongoose.createConnection(PopulateTester.server.getUri());
    }
  }

  static async before() {
    // set schemas of test db
    const userSchema = new Mongoose.Schema({
      name: String,
      email: String,
      friends: [{ type: Mongoose.Schema.Types.ObjectId, ref: 'User' }]
    });
    const postSchema = new Mongoose.Schema({
      title: String,
      contents: String,
      createdBy: { type: Mongoose.Schema.Types.ObjectId, ref: 'User' },
      likedBy: [{ type: Mongoose.Schema.Types.ObjectId, ref: 'User' }]
    });

    await PopulateTester.connect();
    PopulateTester.User = PopulateTester.conn.model('User', userSchema);
    PopulateTester.Post = PopulateTester.conn.model('Post', postSchema);

    // populate some testing data
    const jim = new PopulateTester.User({ name: 'Jim', email: 'jim@mail.com' });
    await jim.save();
    const john = new PopulateTester.User({ name: 'John', email: 'john@mail.com' });
    await john.save();
    const kate = new PopulateTester.User({ name: 'Kate', email: 'kate@mail.com' });
    await kate.save();
    // add friends
    await PopulateTester.User.findOneAndUpdate({ name: 'Jim' }, { friends: [john._id] });
    await PopulateTester.User.findOneAndUpdate({ name: 'John' }, { friends: [kate._id] });
    await PopulateTester.User.findOneAndUpdate({ name: 'Kate' }, { friends: [john._id] });

    // add posts
    const post1 = new PopulateTester.Post({
      title: 'Post 1',
      contents: 'Contents of Post 1',
      createdBy: john._id,
      likedBy: [kate._id, jim._id],
    });
    await post1.save();
    const post2 = new PopulateTester.Post({
      title: 'Post 2',
      contents: 'Contents of Post 2',
      createdBy: kate._id,
      likedBy: [jim._id],
    });
    await post2.save();
  }

  static async after() {
    await PopulateTester.Post.collection.drop();
    await PopulateTester.User.collection.drop();
    await PopulateTester.conn?.close();
    await PopulateTester.server?.stop();
  }

  @test('should query with deep populate')
  async testDeepPopulate() {
    const parser = new MongooseQueryParser();
    const qry = 'title&populate=createdBy:friends.name,createdBy:friends.email,createdBy.name,createdBy.email,likedBy.name';
    const parsed = parser.parse(qry);
    assert.exists(parsed.filter);

    let populate: any[] = parsed.populate;
    assert.exists(populate);
    assert.isTrue(populate.length == 2);
    const records = await PopulateTester.Post.find(parsed.filter).populate(populate).lean();
    for (const post of records) {
      assert.exists(post.createdBy.name);
      assert.exists(post.createdBy.friends.find((f) => f.name && f.email));
      assert.exists(post.likedBy);
    }
  }

  @test('should query with populate')
  async testPopulate() {
    const parser = new MongooseQueryParser();
    const qry = 'title&populate=createdBy.name,createdBy.email,likedBy';
    const parsed = parser.parse(qry);
    let populate: any[] = parsed.populate;
    assert.exists(populate);
    assert.isTrue(populate.length == 2);
    for (const p of populate) {
      assert.isTrue(['createdBy', 'likedBy'].includes(p.path));
      if (p.select) {
        assert.isTrue(p.select == 'name email');
      }
    }
    assert.exists(parsed.filter);
    const records = await PopulateTester.Post.find(parsed.filter).populate(populate).lean();
    for (const post of records) {
      assert.exists(post.createdBy.name);
      assert.exists(post.likedBy);
    }
  }
}
