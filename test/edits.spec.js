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

const CHANGESET_CNT = 39;
const NUMBER_OF_PAGES = 4;
const EMPTY_CHANGESET_CNT = 8;

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

function clickButton(btn) {
  return new Promise((resolve) => {
    btn.simulate('click');
    setTimeout(resolve, 5);
  });
}

function clickButtonXtimes(btn, times) {
  if (times < 1) return null;

  return clickButton(btn)
    .then(() => clickButtonXtimes(btn, times - 1));
}

function addFaultyRevision() {
  let i = 0;
  while (changesets[i] && (changesets[i].type !== 'edit')) {
    i += 1;
  }
  changesets[i].revisions.push({
    type: 'unknown',
    original: {},
    _id: 'a',
    time: 29,
  });
}


describe('<Edits />', function () {
  before(function () {
    Edits.__Rewire__('KeduIje', KeduIje);
    addFaultyRevision();
  });

  after(function () {
    Edits.__ResetDependency__('KeduIje');
  });

  describe('User history', function () {
    let wrapper;
    before(function (done) {
      setTimeout(done, 10);
      wrapper = mount(<Edits />);
    });

    describe('after paging to the end', function () {
      before(function () {
        const showMoreBtn = wrapper.find('button').at(0);
        expect(wrapper.find('button')).to.have.lengthOf(1);
        return clickButtonXtimes(showMoreBtn, NUMBER_OF_PAGES - 1);
      });

      // ✓ GOOD
      it('hides "show more button"', function () {
        expect(wrapper.find('button')).to.have.lengthOf(0);
      });

      // ✓ GOOD
      it('shows all non-empty changesets', function () {
        expect(wrapper.find('.panel')).to.have.lengthOf(CHANGESET_CNT - EMPTY_CHANGESET_CNT);
      });

      describe('for each changeset', function () {
        function changesetIt(query, spec, test) {
          it(spec, function () {
            let count = 0;
            wrapper.find('.panel').forEach((panel) => {
              count += 1;
              const node = panel.find(query);
              test(node);
            });
            expect(count).to.equal(CHANGESET_CNT - EMPTY_CHANGESET_CNT);
          });
        }

        // ✓ GOOD
        changesetIt('span.label.label-default', 'displays valid dates', function (dateLabel) {
          const dateStr = dateLabel.text();
          const timestamp = Date.parse(dateStr);
          expect(timestamp).to.not.be.NaN;
        });

        changesetIt('.song-title', 'creates valid links to song page', function (a) {
          expect(a.props().href).to.match(/^\/music\/[a-zA-Z-]+$/);
          expect(a.props().href).not.to.match(/null/);
          expect(a.text()).to.have.length.greaterThan(0);
        });

        changesetIt('.panel-body', 'is never empty', function (cs) {
          const activityCnt = cs.find('.list-group').length;
          // const heading = cs.find('.panel-heading').text();
          const media = cs.find('.media').length;
          // console.log(`${heading} has ${activityCnt} activities and ${media} media`);
          expect(media + activityCnt).to.be.above(0);
        });

        changesetIt('.panel-body .list-group', 'sorts edits by time', function (cs) {
          // console.log(cs.html());
          let lastTime = -1;
          debugger;
          cs.find('a').forEach((edit) => {
            const timeUrl = edit.props().href;
            const time = parseInt(timeUrl.split('#')[1], 10);
            expect(time).to.be.at.least(lastTime);
            lastTime = time;
          });
        });

        changesetIt('.changed-time', 'only shows time changes, when time changed', function (times) {
          times.forEach(function (t) {
            // console.log(t.html());
            const origTime = t.find('a').at(0).text();
            const newTime = t.find('a').at(1).text();
            // console.log(`${origTime} --> ${newTime}`);
            expect(origTime).not.to.equal(newTime);
          });
        });

        /*
        changesetIt('.panel-body .list-group-item', 'displays each line update', function (group) {
          group.find('.updated-line').forEach((edit) => {
            console.log(edit.html());
            const a = edit.find('a').at(0);
            expect(a.props().href).to.match(/^\/music\/[a-zA-Z-]+#/);
            const re = /#(.*)$/;
            const matches = a.props().href.match(re);
            if (!matches) {
              throw new Error('could not find props data sent from server');
            }
            const time = parseInt(matches[1], 10);
            expect(time).not.to.be.NaN;
            expect(a.text()).to.have.length.greaterThan(0);
            // if text edit;
            const text = edit.find('strong');
            if (text.length) expect(text.at(0).text()).to.have.length.greaterThan(0);
          });
        }); */
      });
    });

    // ✓ GOOD
    it('queries based on user', function () {
      expect(KeduIje.getChangesets.calledOnce).to.be.true;
      const arg = KeduIje.getChangesets.lastCall.args[0];
      expect(arg).to.have.all.keys(['userID']);
    });

    it('shows debug statemes', function () {
      const revertDebug = Edits.__Rewire__('DEBUG', true);
      wrapper.update();
      revertDebug();
    });

    xit('shows diff for changed text', function () {
      wrapper.find('strong');
    });
  });

  describe('Media history', function () {
    let wrapper;
    before(function (done) {
      setTimeout(done, 10);
      KeduIje.getChangesets.resetHistory();
      wrapper = mount(<Edits mediaID="a" />);
    });

    it('queries based on media', function () {
      expect(KeduIje.getChangesets.calledOnce).to.be.true;
      const arg = KeduIje.getChangesets.lastCall.args[0];
      expect(arg).to.have.all.keys(['mediaID']);
    });
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
