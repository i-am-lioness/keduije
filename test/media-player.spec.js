/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';
import MediaPlayer from '../react/components/media-player';
import KeduIjeMedia from '../react/keduije-media';

describe('<MediaPlayer />', () => {
  describe('rendering', function () {
    // todo: where did https come from?
    it('displays correct artist name', () => {
      const wrapper = shallow(<MediaPlayer
        canEdit={false}
        src={'https://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://localhost:3000&playsinline=1&rel=0&controls=0'}
        mediaType={1}
        mediaID={'58e638a2d300e060f9cdd6ca'}
        img={'https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1'}
        artist={'Luther'}
        title={'Ada'}
        slug={'Ada'}
      />);

      expect(wrapper.find('.song-info .title').text()).to.equal('Ada');
    });

    it('always displays artwork');

    it('control bar affixed to top when scrolled past "affix point"');

    it('control bar disapears when scrolling back to top');

    it('control bar displays song info');

    it('shows edit button only when logged in');
  });

  describe('playing video', function () {
    const player = (<MediaPlayer
      canEdit={false}
      src={'https://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://localhost:3000&playsinline=1&rel=0&controls=0'}
      mediaType={KeduIjeMedia.mediaTypes.VIDEO}
      mediaID={'58e638a2d300e060f9cdd6ca'}
      img={'https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1'}
      artist={'Luther'}
      title={'Ada'}
      slug={'Ada'}
    />);

    let wrapper = null;

    it('loads youtube iframe API', (done) => {
      setTimeout(() => {
        expect(window.onYouTubeIframeAPIReady.calledOnce).to.be.true;
        expect(MediaPlayer.prototype.onPlayerReady.calledOnce).to.be.true;
        done();
      }, 1900);

      sinon.spy(MediaPlayer.prototype, 'componentDidMount');
      sinon.spy(MediaPlayer.prototype, 'onPlayerReady');

      const container = document.getElementById('react') || document.getElementsByTagName('body')[0];
      wrapper = mount(player, { attachTo: container });
      sinon.spy(window, 'onYouTubeIframeAPIReady');

      expect(MediaPlayer.prototype.componentDidMount.calledOnce).to.equal(true);
    });

    it('displays youtube video', function (done) {
      // doesn't show title
      // shows right colors
      // doesn't show related videos when done
      this.timeout(4000);
      let iframe = wrapper.find('iframe').at(0).getDOMNode();
      expect(iframe.offsetWidth).to.equal(685);
      expect(iframe.offsetHeight).to.equal(0);

      wrapper.find('.glyphicon-play').at(0).simulate('click');
      setTimeout(() => {
        iframe = wrapper.find('iframe').at(0).getDOMNode();
        console.log(iframe.offsetHeight);
        expect(iframe.offsetHeight).to.be.above(0);
        done();
        wrapper.find('.glyphicon-pause').at(0).simulate('click');
      }, 1000);
    });

    it('button returns to display mode from karoke mode');

    it('only loads youtube api after callback is set');
  });

  describe('playback', function () {
    it('lyrics are not highlighted when in edit mode');

    it('advances progressbar during playback');

    it('allows user to "seekTo" for videos');

    it('allows user to "seekTo" for audio');

    it('activates each line at least once during playback');

    it('play button shows play graphic when media paused, and vice versa');

    it('updates progress bar after jumping (during outside of edit mode)');

    it('play song from time mark in hash');
  });

  describe('user interactions', function () {

    it('can cancel edit dialog');

    it('can use editor even after editing old lyric');

    it('edit mode button toggles edit mode');

    it('toggles play state on keyboard event');

    it('maintains lyric editor position in between edit sessions');

    it('returns to original state after canceling edit header dialog');

    it('shows seeker guide on progress bar during mouse over');

    it('keeps time markers consistent while editing an old lyric');

    it('shows different dialog for editing vs creating lines ');

    it('shows original text for editing old lyric ');
  });

  describe('CRUD [integration]', function () {
    it('allows users to create headings');

    it('allows users to add headings');

    it('saves creator for each new lyric');

    it('applies time mark changes');

    // nothing beyond, "text", "header", "timeStart", and "timeEnd"
    it('should not store/send any extra client-generated data');

    it('updates url when title changes');
  });
});
