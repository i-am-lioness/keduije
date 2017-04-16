/* eslint-env mocha, browser */
import React from 'react';
import { expect, assert } from 'chai';
import { mount, shallow, render } from 'enzyme';
import sinon from 'sinon';
import LyricDisplay from '../react/components/lyric-display';
import PencilIcon from '../react/components/pencil-icon';
import { lyrics } from './utils/data';

describe.only('<LyricDisplay />', () => {
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
      wrap.find('.lyric-line').at(2).simulate('click');
      expect(seekTo.calledWithExactly(34, 37)).to.be.true;
    });

    it('displays headings');
  });

  describe('edit mode', function () {
    let line = null;
    let newHeaderBtn = null;

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

    it('allows user to locally edit lyric ', function () {
      line.find(PencilIcon).simulate('click');
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
      newHeaderBtn.simulate('click');
      expect(showEditHeaderDialog.calledWithExactly(lyrics[3])).to.be.true;
    });

    it('shows hover effect on mouse over header', function () {
      line = wrap.find('h4').at(0);
      line.simulate('mouseEnter');
      expect(wrap.instance().state.hoveredIdx).to.equal(1);
    });

    it('allows user to edit header ', function () {
      line.find(PencilIcon).simulate('click');
      expect(showEditHeaderDialog.calledWithExactly(lyrics[1])).to.be.true;
    });

    it('does not show deleted lines');

    it('only allows editing during edit mode ');

    it('shows edit icons during edit mode on small screens');

    it('does not show hover effect on touch');

    it('displays lyrics in chronological order ', function () {

    });
  });

  describe('interaction', function () {
    it('has exactly one lyric highlighted at a time ');
    it('only highlights lyrics when not in edit mode');

    it('scrolls when lyrics are off the screen ');

    it('shows less lines during karoke mode');

    // https://github.com/nnennaude/keduije/commit/a4607b727fd39214c86378d34e0e667b32e27de4
    it('only scrolls during playback');
    // does not copy button text, when not in edit-mode
    it('allows for pretty copying of lyrics');
  });
});
