/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';
import LyricDisplay from '../react/components/lyric-display';
import PencilIcon from '../react/components/pencil-icon';
import { lyrics } from './utils/data';

describe('<LyricDisplay />', () => {
  const seekTo = sinon.spy();
  const showEditDialog = sinon.spy();
  const showEditHeaderDialog = sinon.spy();
  let wrap = null;
  describe('basic rendering', function () {
    before(function () {
      const display = (<LyricDisplay
        lyrics={lyrics}
        currentTime={0}
        editMode={false}
        jumpTo={seekTo}
        showEditDialog={showEditDialog}
        showEditHeaderDialog={showEditHeaderDialog}
        videoIsPlaying={false}
      />);

      sinon.spy(LyricDisplay.prototype, 'eachLyric');
      wrap = shallow(display);
    });

    it('displays all the lyrics', () => {
      const lyricsCnt = lyrics.length;

      expect(LyricDisplay.prototype.eachLyric.callCount).to.be.at.least(lyricsCnt);
      expect(wrap.find('.lyric-line')).to.have.length(lyricsCnt);
    });

    it('initially hides the edit buttons', () => {
      expect(wrap.find(PencilIcon)).to.have.length(0);
    });

    it('plays the right lyric when clicked ', function () {
      const line = wrap.find('.lyric-line').at(2);
      const e = { preventDefault: () => {}, currentTarget: line.node };
      line.simulate('click', e);
      expect(seekTo.calledWithExactly(34, 37)).to.be.true;
    });

    it('displays headings');
  });

  describe('edit mode', function () {
    let line = null;
    let newHeaderBtn = null;
    const clickEvent = { stopPropagation: () => undefined };

    before(function () {
      const display = (<LyricDisplay
        lyrics={lyrics}
        currentTime={0}
        editMode
        jumpTo={seekTo}
        showEditDialog={showEditDialog}
        showEditHeaderDialog={showEditHeaderDialog}
        videoIsPlaying={false}
      />);
      wrap = shallow(display);
    });

    it('shows hover effect on mouse over line', function () {
      line = wrap.find('.lyric-line').at(2);
      line.simulate('mouseEnter');
      expect(wrap.instance().state.hoveredIdx).to.equal(3); // because of header
    });

    it('only allows editing during edit mode ', function () {
      wrap.setProps({ editMode: false });
      line.find(PencilIcon).simulate('click', clickEvent);
      expect(showEditDialog.called).to.be.false;
    });

    it('allows user to locally edit lyric ', function () {
      wrap.setProps({ editMode: true });
      line.find(PencilIcon).simulate('click', clickEvent);
      expect(showEditDialog.calledWithExactly(lyrics[2])).to.be.true;
    });

    it('shows hover effect on mouse over add header button', function () {
      newHeaderBtn = wrap.find('.add-heading-btn').at(2);
      newHeaderBtn.simulate('mouseEnter');
      expect(wrap.instance().state.hoveredLinkIdx).to.equal(4); // because of header
    });

    it('shows edit header dialog when add header button clicked', function () {
      line = wrap.find('.lyric-line').at(3);
      line.simulate('mouseEnter');
      newHeaderBtn.simulate('click', clickEvent);
      expect(showEditHeaderDialog.calledWithExactly(lyrics[3])).to.be.true;
    });

    it('shows hover effect on mouse over header', function () {
      line = wrap.find('h4').at(0);
      line.simulate('mouseEnter');
      expect(wrap.instance().state.hoveredIdx).to.equal(1);
    });

    it('allows user to edit header ', function () {
      line.find(PencilIcon).simulate('click', clickEvent);
      expect(showEditHeaderDialog.calledWithExactly(lyrics[1])).to.be.true;
    });

    it('removes hover effect on when mouse leaves add-header-btn', function () {
      newHeaderBtn.simulate('mouseLeave');
      expect(wrap.instance().state.hoveredLinkIdx).to.equal(-1);
    });

    it('removes hover effect for pencil when mouse leaves display', function () {
      wrap.simulate('mouseLeave');
      expect(wrap.instance().state.hoveredIdx).to.equal(-1);
    });

    it('does not show deleted lines');

    it('shows edit icons during edit mode on small screens');

    it('does not show hover effect on touch');

    it('displays lyrics in chronological order ', function () {

    });
  });

  describe('interaction', function () {
    const seekTo = sinon.spy();
    const showEditDialog = sinon.spy();
    const showEditHeaderDialog = sinon.spy();
    let wrap = null;

    before(function () {
      const display = (<LyricDisplay
        lyrics={lyrics}
        currentTime={0}
        editMode={false}
        jumpTo={seekTo}
        showEditDialog={showEditDialog}
        showEditHeaderDialog={showEditHeaderDialog}
        videoIsPlaying={false}
      />);

      wrap = mount(display);
    });

    it('has no more than one lyric highlighted at a time ', function () {
      for (let i = 0; i < 500; i += 1) {
        wrap.setProps({ currentTime: i });
        const len = wrap.find('.current').nodes.length;
        if (len > 1) {
          console.log(`multiple lines are highlighted at time = ${i}`);
          debugger;
        }
        expect(len).not.to.be.above(1);
      }
    });

    it('in karoke mode, has no more than one lyric highlighted at a time ', function () {
      wrap.setProps({ videoIsPlaying: true });
      for (let i = 0; i < 500; i += 1) {
        wrap.setProps({ currentTime: i });
        const len = wrap.find('.current').nodes.length;
        if (len > 1) {
          console.log(`multiple lines are highlighted at time = ${i}`);
          debugger;
        }
        expect(len).not.to.be.above(1);
      }
    });

    it('only highlights lyrics when not in edit mode');

    it('scrolls when lyrics are off the screen ');

    it('shows less lines during karoke mode');

    // https://github.com/nnennaude/keduije/commit/a4607b727fd39214c86378d34e0e667b32e27de4
    it('only scrolls during playback');
    // does not copy button text, when not in edit-mode
    it('allows for pretty copying of lyrics');
  });
});
