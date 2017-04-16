/* eslint-env mocha, browser */
import React from 'react';
import { expect, assert } from 'chai';
import { mount, shallow, render } from 'enzyme';
import sinon from 'sinon';
import LyricDisplay from '../react/components/lyric-display';
import KeduIjeMedia from '../react/keduije-media';
import { lyrics } from './utils/data';

describe('<LyricDisplay />', () => {
  it('displays all the lyrics', () => {
    const display = (<LyricDisplay
      lyrics={lyrics}
      currentTime={0}
      editMode={false}
      jumpTo={() => {}}
      showEditDialog={() => {}}
      showEditHeaderDialog={() => {}}
      videoIsPlaying={false}
    />);

    const lyricsCnt = lyrics.length;
    console.log(lyricsCnt);

    sinon.spy(LyricDisplay.prototype, 'eachLyric');

    const wrap = shallow(display);

    expect(LyricDisplay.prototype.eachLyric.callCount).to.be.at.least(lyricsCnt);
    expect(wrap.find('.lyric-line')).to.have.length(lyricsCnt);
  });

  it('initially hides the edit buttons', () => {
    const display = (<LyricDisplay
      lyrics={lyrics}
      currentTime={0}
      editMode={true}
      jumpTo={() => {}}
      showEditDialog={() => {}}
      showEditHeaderDialog={() => {}}
      videoIsPlaying={false}
    />);

    const lyricsCnt = lyrics.length;
    const wrap = render(display);

    expect(wrap.find('.glyphicon-pencil')).to.have.length(lyricsCnt + 1);
  });

  it('displays lyrics in chronological order ', function () {

  });

  it('scrolls when lyrics are off the screen ');

  it('plays the right lyric when clicked ');

  it('shows media during karoke mode ');

  it('has exactly one lyric highlighted at a time ');

  it('allows user to locally edit lyric ');

  it('only allows editing during edit mode ');

  it('shows different dialog for editing vs creating lines ');

  it('shows original text for editing old lyric ');

  it('displays headings');

  it('shows edit header dialog when add header button clicked');

  it('only highlights lyrics when not in edit mode');

  it('shows hover effect on mouse over');

  it('does not show hover effect on touch');

  // https://github.com/nnennaude/keduije/commit/a4607b727fd39214c86378d34e0e667b32e27de4
  it('only scrolls during playback');

  // does not copy button text, when not in edit-mode
  it('allows for pretty copying of lyrics');

  it('shows edit icons during edit mode on small screens');

  it('does not show deleted lines');
});
