/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { mount } from 'enzyme';
import Edits from '../react/components/edits';
import { KeduIje } from './utils/mocks';
import { changesets } from './utils/data';

/*
-changeset if(song)

generate more data
-change song title
-change song image
-delete a song

-test queries
-do song history instead of personal history

-"eachEdit" else
-restore a line?

*/

let start = 0;
KeduIje.getChangesets.callsFake(() => {
  const end = start + 10;
  const page = changesets.slice(start, end);
  start = end;
  return Promise.resolve(page);
});

KeduIje.getMediaInfo.callsFake((_id) => {
  const song = {};
  song.slug = 'horses';
  song.title = 'Horses';
  song.img = 'horses.jpg';
  song._id = _id;
  return Promise.resolve(song);
});

describe('<Edits />', function () {
  let revertKeduIje;

  before(function () {
    revertKeduIje = Edits.__Rewire__('KeduIje', KeduIje);
  });

  after(function () {
    revertKeduIje();
  });

  describe('User history', function () {
    let wrapper;
    before(function (done) {
      setTimeout(done, 10);
      wrapper = mount(<Edits />);
    });

    it('should make no difference whether user prop is defined or not');

    it('shows all edits for user', function () {
      expect(wrapper.find('.panel')).to.have.lengthOf(10);
    });

    it('shows debug statemes', function () {
      const revertDebug = Edits.__Rewire__('DEBUG', true);
      wrapper.update();
      revertDebug();
    });

    xit('shows diff for changed text', function () {
      wrapper.find('strong');
    });

    it('hides "show more button" when there are no more revisions', function (done) {
      const showMoreBtn = wrapper.find('button').at(0);
      if (showMoreBtn.length === 0) done();
      showMoreBtn.simulate('click');
      setTimeout(() => {
        expect(wrapper.find('button')).to.have.lengthOf(1);
        done();
      }, 10);
    });

    it('only shows time changes, when time changed', function () {
      wrapper.find('.changed-time').forEach((t) => {
        const origTime = t.find('a').at(0).text();
        const newTime = t.find('a').at(1).text();
        console.log(`${origTime} --> ${newTime}`);
        expect(origTime).not.to.equal(newTime);
      });
    });

    it('creates valid links to song page', function () {
      wrapper.find('.song-title').forEach((a) => {
        expect(a.props().href).to.match(/^\/music\/[a-zA-Z-]+$/);
        expect(a.props().href).not.to.match(/null/);
        expect(a.text()).to.have.length.greaterThan(0);
      });
    });

    it('displays each line update', function () {
      wrapper.find('.panel-body .list-group-item .updated-line').forEach((edit) => {
        const a = edit.find('a').at(0);
        const text = edit.find('strong').at(0).text();
        expect(a.props().href).to.match(/^\/music\/[a-zA-Z-]+#/);
        const re = /#(.*)$/;
        const matches = a.props().href.match(re);
        if (!matches) {
          throw new Error('could not find props data sent from server');
        }
        const time = parseInt(matches[1], 10);
        expect(time).not.to.be.NaN;
        expect(a.text()).to.have.length.greaterThan(0);
        expect(text).to.have.length.greaterThan(0);
      });
    });

    it('does not display empty changesets', function () {
      wrapper.find('.panel').forEach((cs) => {
        const activityCnt = cs.find('.list-group').length;
        const heading = cs.find('.panel-heading').text();
        const media = cs.find('.media').length;
        console.log(`${heading} has ${activityCnt} activities and ${media} media`);
        expect(media + activityCnt).to.be.above(0);
      });
    });

    it('sorts edits within a changeset by time', function () {
      wrapper.find('.panel').forEach((cs) => {
        cs.find('a').forEach(edit => {
          edit.props().href;
        });
      });
    });
  });

  describe('history by media', function () {
    let wrapper;
    before(function (done) {
      setTimeout(done, 10);
      wrapper = mount(<Edits mediaID="5900a5987dccb248571bcaf8" />);
    });
    it('shows all edits for media');
  });

  it('only displays revisions that are "done"');

  it('includes song creations');

  it('shows page title');

  it('shows song edit'); // to do: to test, change el.collectionName back to el.type

  it('should hide "show more" button by default');

  it('[integration] show line adds');

  it('[integration] show line edits');

  it('[integration] show song adds');

  it('[integration] shows line deletions');

  it('[integration] shows song removals');

  it('[integration] shows time changes');

  it('[integration] shows "changesets"- aggregate edits within edit session');
});
