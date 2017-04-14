/* eslint-env mocha, browser */
import React from 'react';
import { expect, assert } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';
import LyricDisplay from '../react/components/lyric-display';
import KeduIjeMedia from '../react/keduije-media';

describe('<LyricDisplay />', () => {
  it('displays all the lyrics', (done) => {
    const display = (<LyricDisplay
      lyrics={this.state.lyrics}
      currentTime={0}
      editMode={false}
      jumpTo={() => {}}
      showEditDialog={() => {}}
      showEditHeaderDialog={() => {}}
      videoIsPlaying={false}
    />);

    sinon.spy(LyricDisplay.prototype, 'eachLyric');

    const wrapper = shallow(display);
    sinon.spy(window, 'onYouTubeIframeAPIReady');

    expect(LyricDisplay.prototype.eachLyric).to.equal(true);
  });

  it('initially hides the edit buttons', () => {

    const wrapper = mount( <MediaPlayer
      canEdit={false}
      src={"http://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://keduije1.herokuapp.com&playsinline=1&rel=0&controls=0"}
      mediaType={1}
      mediaID={"58e638a2d300e060f9cdd6ca"}
      img={"https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1"}
      artist={"Luther"}
      title={"Ada"}
      slug={"Ada"}
    />);

    expect(wrapper.find('.song-info .title').text()).to.equal('Ada');
  });

  it('scrolls when lyrics are off the screen ', () => {

  });

  it('plays the right lyric when clicked ', () => {

  });

  it('shows media during karoke mode ', () => {

  });

  it('has exactly one lyric highlighted at a time ', () => {

  });

  it('displays lyrics in chronological order ', () => {

  });

  it('allows user to locally edit lyric ', () => {

  });

  it('only allows editing during edit mode ', () => {

  });

  it('shows different dialog for editing vs creating lines ', () => {

  });

  it('shows original text for editing old lyric ', () => {

  });

  it('displays headings', () => {

  });

  it('shows edit header dialog when add header button clicked', () => {

  });

  it('only highlights lyrics when not in edit mode', () => {

  });

  it('shows hover effect on mouse over', () => {

  });

  it('does not show hover effect on touch', () => {

  });

  it('only scrolls during playback', () => {
    // https://github.com/nnennaude/keduije/commit/a4607b727fd39214c86378d34e0e667b32e27de4

  });

  it('allows for pretty copying of lyrics', () => {
    // does not copy button text, when not in edit-mode

  });

  it('shows edit icons during edit mode on small screens', () => {

  });

  it('does not show deleted lines', () => {

  });
});
