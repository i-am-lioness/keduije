/* eslint-env mocha */
import { expect } from 'chai';
import connectDB from '../lib/db';
import { tables } from '../lib/constants';

const Db = require('mongodb').Db;
const Collection = require('mongodb').Collection;
require('dotenv').config();

describe('db.js', function () {
  let db;

  before(function () {
    return connectDB(process.env.LOCAL_DB_URL)
      .then((_db) => {
        db = _db;
      });
  });

  // ✓ GOOD
  it('should return expected object', function () {
    expect(db).to.be.a('function');
    expect(db).to.haveOwnProperty('_DB');
    expect(db._DB).to.be.an.instanceOf(Db);
  });

  // ✓ GOOD
  Object.values(tables).forEach(function (table) {
    it(`it should return '${table}' collection`, function () {
      const collection = db(table);
      expect(collection).to.be.an.instanceOf(Collection);
      expect(collection.collectionName).to.equal(table);
    });
  });

  // ✓ GOOD
  it('it should handle unknown collection', function () {
    const fn = () => { db('house'); };
    expect(fn).to.throw(/unknown collection name/);
  });

  // ✓ GOOD
  it('it should handle connection error', function () {
    return connectDB('sasf').catch(err => err)
      .then((err) => {
        expect(err).to.be.an('error');
      });
  });

  it('should check for url parameter');
});
