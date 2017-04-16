/* eslint-env mocha, browser */
import React from 'react';
import { expect, assert } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';
import MediaPlayer from '../react/components/media-player';
import KeduIjeMedia from '../react/keduije-media';

describe('<MediaPlayer />', () => {
  it('loads youtube iframe API', (done) => {
    const player = (<MediaPlayer
      canEdit={false}
      src={'http://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://keduije1.herokuapp.com&playsinline=1&rel=0&controls=0'}
      mediaType={KeduIjeMedia.mediaTypes.VIDEO}
      mediaID={'58e638a2d300e060f9cdd6ca'}
      img={'https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1'}
      artist={'Luther'}
      title={'Ada'}
      slug={'Ada'}
    />);

    let wrapper = null;

    setTimeout(() => {
      // console.log(wrapper);
      expect(window.onYouTubeIframeAPIReady.calledOnce).to.be.true;
      //expect(MediaPlayer.prototype.onPlayerReady.calledOnce).to.be.true;
      done();
    }, 600);

    sinon.spy(MediaPlayer.prototype, 'componentDidMount');
    sinon.spy(MediaPlayer.prototype, 'onPlayerReady');

    const container = document.getElementById('react') || document.getElementsByTagName('body')[0];
    wrapper = mount(player, { attachTo: container });
    sinon.spy(window, 'onYouTubeIframeAPIReady');

    expect(MediaPlayer.prototype.componentDidMount.calledOnce).to.equal(true);
  });

  it('displays correct artist name', () => {
    const wrapper = mount(<MediaPlayer
      canEdit={false}
      src={'http://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://keduije1.herokuapp.com&playsinline=1&rel=0&controls=0'}
      mediaType={1}
      mediaID={'58e638a2d300e060f9cdd6ca'}
      img={'https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1'}
      artist={'Luther'}
      title={'Ada'}
      slug={'Ada'}
    />);

    expect(wrapper.find('.song-info .title').text()).to.equal('Ada');
  });

  it('displays youtube video', () => {
    // fills width
    // doesn't show title
    // shows right colors
    // doesn't show related videos when done

  });

  it('keeps time markers consistent while editing an old lyric');

  it('allows users to create headings');

  it('allows users to add headings');

  it('always displays artwork');

  it('can cancel edit dialog');

  it('shows edit button only when logged in');

  it('lyrics are not highlighted when in edit mode');

  it('saves creator for each new lyric');

  it('advances progressbar during playback');

  it('allows user to "seekTo" for videos');

  it('allows user to "seekTo" for audio');

  it('shows seeker guide on progress bar during mouse over');

  it('updates progress bar after jumping (during outside of edit mode)');

  it('only loads youtube api after callback is set');

  // nothing beyond, "text", "header", "timeStart", and "timeEnd"
  it('should not store/send any extra client-generated data');

  it('updates url when title changes');

  it('control bar affixed to top when scrolled past "affix point"');

  it('control bar disapears when scrolling back to top');

  it('control bar displays song info');

  it('play button shows play graphic when media paused, and vice versa');

  it('activates each line at least once during playback');

  it('button returns to display mode from karoke mode');

  it('maintains lyric editor position in between edit sessions');

  it('returns to original state after canceling edit header dialog');

  it('toggles play state on keyboard event');

  it('edit mode button toggles edit mode');

  it('play song from time mark in hash');

  it('can use editor even after editing old lyric');

  it('applies time mark changes');
});
