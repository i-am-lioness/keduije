/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { shallow, mount } from 'enzyme';
import sinon from 'sinon';
import TimeSpinner from '../react/components/time-spinner';
import LyricDisplay from '../react/components/lyric-display';
import MediaPlayer from '../react/components/media-player';
import LyricEditor from '../react/components/lyric-editor';
import SongInfoForm from '../react/components/song-info-form';
import ProgressBar from '../react/components/progress-bar';
import { mediaTypes } from '../react/keduije-media';
import { lyrics, songInfo } from './utils/data';
import { KeduIje, Video, Audio, videoDuration, audioDuration, scrollIfOutOfView, convertToTime } from './utils/mocks';

const loadYoutubeIFrameAPI = sinon.stub();

MediaPlayer.__Rewire__('loadYoutubeIFrameAPI', loadYoutubeIFrameAPI);
MediaPlayer.__Rewire__('Video', Video);
MediaPlayer.__Rewire__('Audio', Audio);
MediaPlayer.__Rewire__('KeduIje', KeduIje);
TimeSpinner.__Rewire__('convertToTime', convertToTime);
LyricDisplay.__Rewire__('scrollIfOutOfView', scrollIfOutOfView);

describe('<MediaPlayer />', () => {
  describe('rendering: ', function () {
    let wrapper;
    const artistValue = 'Ada';
    const titleValue = 'Ekwe';

    before(function () {
      wrapper = shallow(<MediaPlayer
        canEdit={false}
        src={'https://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://localhost:3000&playsinline=1&rel=0&controls=0'}
        mediaType={1}
        mediaID={'58e638a2d300e060f9cdd6ca'}
        img={'https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1'}
        artist={artistValue}
        title={titleValue}
        slug={'Ada'}
      />);
    });

    it('does not render edit switch for user without edit privileges', function () {
      const editSwitch = wrapper.find('.switch');
      expect(editSwitch).to.have.lengthOf(0);
    });

    it('displays song info', function () {
      expect(wrapper.find('.song-info .title').text()).to.equal(titleValue);
      expect(wrapper.find('.song-info .artist').text()).to.equal(artistValue);
    });

    it('shows edit button if logged in, and doesnt if not');

    it('always displays artwork');

    it('renders all elements');

    describe('all child components have valid properties-', function () {
      it('initializes progress bar with valid percentage of 0', function () {
        expect(wrapper.find(ProgressBar).at(0).dive().instance().props.percentage).to.equal(0);
      });
    });
  });

  describe('loading video- ', function () {
    const player = (<MediaPlayer
      canEdit={false}
      src={'https://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://localhost:3000&playsinline=1&rel=0&controls=0'}
      mediaType={mediaTypes.VIDEO}
      mediaID={'58e638a2d300e060f9cdd6ca'}
      img={'https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1'}
      artist={'Luther'}
      title={'Ada'}
      slug={'Ada'}
    />);

    let wrapper = null;

    it('loads youtube iframe API', (done) => {
      loadYoutubeIFrameAPI.callsArg(0);

      sinon.spy(MediaPlayer.prototype, 'componentDidMount');
      sinon.spy(MediaPlayer.prototype, 'onPlayerReady');

      wrapper = mount(player);

      expect(MediaPlayer.prototype.componentDidMount.calledOnce).to.equal(true);
      expect(loadYoutubeIFrameAPI.calledOnce).to.be.true;
      const cb = wrapper.instance().onYouTubeIframeAPIReady;
      expect(loadYoutubeIFrameAPI.calledWith(cb)).to.be.true;
      expect(Video.called).to.be.true;
      setTimeout(function () {
        expect(wrapper.instance().maxTime).to.equal(videoDuration);
        expect(wrapper.instance().mediaLoaded).to.be.true;
        done();
      }, 15);
    });

    it('should initially render correct display/layout', function () {
      expect(wrapper.find('.info-bar').hasClass('affix')).to.be.false;
      expect(wrapper.find('.info-bar').hasClass('hold')).to.be.false;
    });

    describe('playback- ', function () {
      it('can start playing', function (done) {
        expect(wrapper.instance().state.isPlaying).to.be.false;
        wrapper.instance().togglePlayState();

        setTimeout(function () {
          expect(wrapper.instance().state.isPlaying).to.be.true;
          done();
        }, 10);
      });

      it('should have the control/info bar held to the bottom', function () {
        expect(wrapper.find('.info-bar').hasClass('affix')).to.be.false;
        expect(wrapper.find('.info-bar').hasClass('hold')).to.be.true;
      });

      it('should progress', function (done) {
        this.timeout(3000);
        expect(wrapper.instance().state.isPlaying).to.be.true;
        const startTime = wrapper.instance().state.currentTime;

        setTimeout(function () {
          expect(wrapper.instance().state.currentTime).to.be.above(startTime);
          expect(wrapper.instance().state.isPlaying).to.be.true;
          done();
        }, 2000);
      });

      it('can jump to another time mark', function (done) {
        this.timeout(3000);
        expect(wrapper.instance().state.isPlaying).to.be.true;
        const newPercentage = 0.5;

        wrapper.instance().seekTo(newPercentage);

        setTimeout(function () {
          expect(wrapper.instance().state.currentTime)
            .to.be.at.least(newPercentage * videoDuration);
          expect(wrapper.instance().state.isPlaying).to.be.true;
          done();
        }, 2000);
      });

      it('can pause', function (done) {
        expect(wrapper.instance().state.isPlaying).to.be.true;
        wrapper.instance().togglePlayState();

        setTimeout(function () {
          expect(wrapper.instance().state.isPlaying).to.be.false;
          done();
        }, 10);
      });

      it('play song from time mark in hash');

      it('button returns to display mode from karoke mode');
    });
  });

  describe('Edit mode', function () {
    let wrapper;
    const artistValue = 'Ada';
    const titleValue = 'Ekwe';
    let loadLyrics;
    let setEditMode;
    let displaySongInfo;

    before(function () {
      wrapper = shallow(<MediaPlayer
        canEdit
        src={'https://www.youtube.com/embed/x-q9uCRheWQ?enablejsapi=1&showinfo=0&color=white&modestbranding=1&origin=http://localhost:3000&playsinline=1&rel=0&controls=0'}
        mediaType={1}
        mediaID={'58e638a2d300e060f9cdd6ca'}
        img={'https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1'}
        artist={artistValue}
        title={titleValue}
        slug={'Ada'}
      />);
      loadLyrics = sinon.spy(wrapper.instance(), 'loadLyrics');
      setEditMode = sinon.spy(wrapper.instance(), 'setEditMode');
      displaySongInfo = sinon.spy(wrapper.instance(), 'displaySongInfo');

      // artificial mounting
      wrapper.instance().loadLyrics(lyrics);
      wrapper.instance().displaySongInfo(songInfo);
    });

    afterEach(function () {
      prompt.resetHistory();
      confirm.resetHistory();
      alert.resetHistory();

      KeduIje.updateLyric.resetHistory();
      KeduIje.addLyric.resetHistory();
      KeduIje.startEditSession.resetHistory();
      KeduIje.deleteLyric.resetHistory();

      setEditMode.reset();
      loadLyrics.reset();
      displaySongInfo.reset();
    });

    it('can turn on edit mode', function (done) {
      KeduIje.startEditSession.resolves(true);

      expect(wrapper.instance().state.editMode).to.be.false;
      wrapper.instance().handleToggleEditMode();
      expect(KeduIje.startEditSession.called).to.be.true;
      expect(KeduIje.startEditSession.lastCall.calledWithExactly(true)).to.be.true;
      setTimeout(() => {
        expect(setEditMode.called).to.be.true;
        expect(wrapper.instance().state.editMode).to.be.true;
        done();
      }, 5);
    });

    it('can turn off edit mode', function (done) {
      KeduIje.startEditSession.resolves(false);

      expect(wrapper.instance().state.editMode).to.be.true;
      wrapper.instance().handleToggleEditMode();

      setTimeout(() => {
        expect(KeduIje.startEditSession.called).to.be.true;
        expect(KeduIje.startEditSession.lastCall.calledWith(false)).to.be.true;
        expect(setEditMode.called).to.be.true;
        expect(wrapper.instance().state.editMode).to.be.false;
        done();
      }, 5);
    });

    it('can handle edit mode cancelation', function (done) {
      KeduIje.startEditSession.resolves(false);

      expect(wrapper.instance().state.editMode).to.be.false;
      wrapper.instance().handleToggleEditMode();

      setTimeout(function () {
        expect(KeduIje.startEditSession.called).to.be.true;
        expect(KeduIje.startEditSession.lastCall.calledWith(true)).to.be.true;
        expect(wrapper.instance().state.editMode).to.be.false;
        done();
      }, 10);
    });

    it('should probably not allow edits if not in edit mode');

    it('allows user to add lyrics', function (done) {
      const lineData = {
        text: 'my my my. my cherie koko',
        startTime: 68,
        endTime: 71,
      };

      wrapper.instance().setState({
        segmentStart: lineData.startTime,
        segmentEnd: lineData.endTime,
        displayEditor: true,
        editMode: true, // to do: move elsewhere
      });

      wrapper.instance().handleTextChange({ target: { value: lineData.text } });

      wrapper.instance().incrementTime('segmentEnd');
      wrapper.instance().incrementTime('segmentEnd');
      lineData.endTime += 2;
      expect(prompt.calledOnce).to.be.false;
      wrapper.instance().saveLyric();

      setTimeout(() => {
        expect(KeduIje.updateLyric.calledOnce).to.be.false;
        expect(KeduIje.addLyric.calledOnce).to.be.true;
        expect(KeduIje.addLyric.lastCall.calledWith(lineData)).to.be.true;
        expect(loadLyrics.called).to.be.true;
        done();
      }, 5);
    });

    it('allows user to cancel lyric creation', function () {
      const lineData = {
        text: 'we meant to be together',
        startTime: 98,
        endTime: 81,
      };

      const originalState = wrapper.instance().state;
      wrapper.instance().setState({
        segmentStart: lineData.startTime,
        segmentEnd: lineData.endTime,
        displayEditor: true,
      });
      // does not restore time markings upon cancelation
      originalState.segmentStart = lineData.startTime;
      originalState.segmentEnd = lineData.endTime;


      wrapper.instance().handleTextChange({ target: { value: lineData.text } });
      wrapper.instance().close();

      expect(KeduIje.updateLyric.calledOnce).to.be.false;
      expect(KeduIje.addLyric.calledOnce).to.be.false;
      expect(wrapper.instance().state).to.eql(originalState);
    });

    it('allows user to edit time marks in a line', function (done) {
      const lineData = {
        text: 'hey pretty lady',
        startTime: 5,
        endTime: 10,
      };

      const lineChanges = {
        startTime: 4,
        endTime: 11,
      };

      wrapper.instance().showEditDialog(lineData);
      wrapper.instance().decrementTime('segmentStart');
      wrapper.instance().incrementTime('segmentEnd');
      expect(prompt.calledOnce).to.be.false;
      wrapper.instance().saveLyric();

      setTimeout(() => {
        expect(KeduIje.updateLyric.calledOnce).to.be.true;
        expect(KeduIje.updateLyric.lastCall.calledWith(lineData, lineChanges)).to.be.true;
        expect(loadLyrics.called).to.be.true;
        done();
      }, 5);

    });

    it('allows user to cancel modifying a line', function () {
      const lineData = {
        text: 'you never know. you are my world',
        startTime: 201,
        endTime: 205,
      };

      const originalState = wrapper.instance().state;
      wrapper.instance().showEditDialog(lineData);

      wrapper.instance().decrementTime('segmentStart');
      wrapper.instance().incrementTime('segmentEnd');

      // does not restore time markings upon cancelation
      originalState.segmentStart = lineData.startTime - 1;
      originalState.segmentEnd = lineData.endTime + 1;

      expect(prompt.calledOnce).to.be.false;
      wrapper.instance().close();

      const finalState = wrapper.instance().state;
      expect(finalState.displayEditor).to.be.false;
      expect(finalState.originalText).to.be.null;
      expect(finalState.editType).to.be.null;
      expect(finalState.text).to.be.empty;
      expect(wrapper.instance().state).to.eql(originalState);
    });

    it('can allow user to add header', function () {
      const newHeader = 'Verse 3';
      prompt.returns(newHeader);

      const lineData = {
        text: 'hey pretty lady',
        startTime: 5,
        endTime: 10,
      };
      const lineChanges = {
        heading: newHeader,
      };
      wrapper.instance().showEditHeaderDialog(lineData);
      expect(prompt.calledOnce).to.be.true;
      expect(prompt.lastCall.calledWith('Please enter heading', '[]')).to.be.true;
      expect(KeduIje.updateLyric.calledOnce).to.be.true;
      expect(KeduIje.updateLyric.lastCall.calledWith(lineData, lineChanges)).to.be.true;
    });

    it('can allow user to modify header', function () {
      const originalHeader = 'Chorus';
      const newHeader = 'refrain';
      prompt.returns(newHeader);

      const lineData = {
        text: 'never gonna leave your side no',
        startTime: 25,
        endTime: 11,
        heading: originalHeader,
      };
      const lineChanges = {
        heading: newHeader,
      };
      wrapper.instance().showEditHeaderDialog(lineData);
      expect(prompt.calledOnce).to.be.true;
      expect(prompt.lastCall.calledWith('Update Heading', originalHeader)).to.be.true;
      expect(KeduIje.updateLyric.calledOnce).to.be.true;
      expect(KeduIje.updateLyric.lastCall.calledWith(lineData, lineChanges)).to.be.true;
    });

    it('can cancel header edit', function () {
      prompt.returns(null);

      const lineData = {
        text: 'hey pretty lady',
        startTime: 5,
        endTime: 10,
      };

      const originalState = wrapper.instance().state;
      wrapper.instance().showEditHeaderDialog(lineData);
      expect(prompt.calledOnce).to.be.true;
      expect(prompt.lastCall.calledWith('Please enter heading', '[]')).to.be.true;
      expect(KeduIje.updateLyric.called).to.be.false;
      expect(wrapper.instance().state).to.equal(originalState);
    });

    it('can delete a line', function (done) {
      confirm.returns(true);
      const lineData = {
        text: 'time will be on our side.',
        startTime: 101,
        endTime: 125,
      };

      wrapper.instance().showEditDialog(lineData);

      wrapper.instance().handleDelete();

      setTimeout(() => {
        expect(KeduIje.deleteLyric.calledOnce).to.be.true;
        expect(KeduIje.deleteLyric.lastCall.calledWith(lineData)).to.be.true;
        expect(loadLyrics.called).to.be.true;
        done();
      }, 10);
    });

    it('can cancel deleting a line', function () {
      confirm.returns(false);
      const lineData = {
        text: 'all this money. too much sause',
        startTime: 56,
        endTime: 61,
      };

      wrapper.instance().showEditDialog(lineData);

      const originalState = wrapper.instance().state;
      wrapper.instance().handleDelete();
      expect(KeduIje.deleteLyric.calledOnce).to.be.false;
      expect(wrapper.instance().state).to.equal(originalState);

      confirm.returns(true); // restoring behavior
    });

    it('can allow user to modify songInfo', function (done) {
      expect(wrapper.instance().state.editDialogIsOpen).to.be.false;

      expect(wrapper.find('#edit-song-info-btn')).to.have.lengthOf(1);
      wrapper.find('#edit-song-info-btn').at(0).simulate('click');
      expect(wrapper.instance().state.editDialogIsOpen).to.be.true;

      const songInfoChanges = {
        artist: 'Brandy',
      };
      const newSongInfo = Object.assign(songInfo, songInfoChanges);
      KeduIje.saveSongInfo.resolves(newSongInfo);

      wrapper.instance().saveSongInfo(songInfoChanges);

      setTimeout(() => {
        expect(KeduIje.saveSongInfo.calledOnce).to.be.true;
        expect(KeduIje.saveSongInfo.lastCall.calledWith(songInfo, songInfoChanges))
          .to.be.true;
        expect(displaySongInfo.calledOnce).to.be.true;
        expect(displaySongInfo.lastCall.calledWith(newSongInfo)).to.be.true;
        expect(wrapper.instance().state.editDialogIsOpen).to.be.false;
        done();
      }, 5);
    });

    it('can cancel editing song info', function () {
      const originalState = wrapper.instance().state;

      expect(wrapper.instance().state.editDialogIsOpen).to.be.false;
      wrapper.find('#edit-song-info-btn').at(0).simulate('click');
      expect(wrapper.instance().state.editDialogIsOpen).to.be.true;

      wrapper.find(SongInfoForm).at(0).dive().instance().props.onCancel();
      expect(wrapper.instance().state).to.eql(originalState);
    });

    it('can delete song', function () {
      expect(wrapper.instance().state.editDialogIsOpen).to.be.false;

      wrapper.find('#edit-song-info-btn').at(0).simulate('click');
      expect(wrapper.instance().state.editDialogIsOpen).to.be.true;

      wrapper.instance().deleteThisSong();
      expect(KeduIje.deleteSong.calledOnce).to.be.true;
      expect(KeduIje.deleteSong.lastCall.calledWith(songInfo)).to.be.true;
    });

    it('handles managing time increments when maxTime is not loaded');
  });

  describe('edit mode during playback- ', function () {
    let wrapper;
    let editSwitch;

    before(function () {
      KeduIje.loadSongInfo.resolves({}); // to do: finish testing handling empty fields

      wrapper = mount(<MediaPlayer
        canEdit
        src={'www.tayotv.net/wp-content/uploads/2017/03/Slowdog-ft.-Phyno-TJ-Testimony-Remix.mp3'}
        mediaType={mediaTypes.AUDIO}
        mediaID={'1111111'}
        img={'https://i.scdn.co/image/a526d11a5add256cbb4940b39c630df4c6af5cc1'}
        artist={'Mariah Carey'}
        title={'Heartbreaker'}
        slug={'Heartbreaker'}
      />);
    });

    it('mounts audio file', function (done) {
      setTimeout(function () {
        expect(wrapper.instance().maxTime).to.equal(audioDuration);
        expect(wrapper.instance().mediaLoaded).to.be.true;
        done();
      }, 15);
    });

    it('renders edit switch for user with edit privileges', function () {
      editSwitch = wrapper.find('.switch');
      expect(editSwitch).to.have.lengthOf(2);
      editSwitch = editSwitch.at(0);
    });

    xit('edit switch turns on edit mode', function () {
      expect(wrapper.instance().state.editMode).to.be.false;
      editSwitch.find('input').at(0).simulate('change');
      expect(wrapper.instance().state.editMode).to.be.true;
    });

    it('can jump to point in media (from Lyric Display), and not stop playback', function (done) {
      this.timeout(6000);
      expect(wrapper.instance().state.isPlaying).to.be.false;

      wrapper.find(LyricDisplay).get(0).props.jumpTo(45, 47);
      setTimeout(function () {
        expect(wrapper.instance().state.isPlaying).to.be.true;
        expect(wrapper.instance().state.currentTime).to.equal(46);
      }, 1500);

      setTimeout(function () {
        expect(wrapper.instance().state.currentTime).to.be.at.least(46);
        expect(wrapper.instance().state.isPlaying).to.be.true;
      }, 2500);

      setTimeout(function () {
        expect(wrapper.instance().state.currentTime).to.be.at.least(48);
        expect(wrapper.instance().state.isPlaying).to.be.true;
      }, 3500);

      setTimeout(function () {
        expect(wrapper.instance().state.currentTime).to.be.at.least(49);
        expect(wrapper.instance().state.isPlaying).to.be.true;
        done();
      }, 4500);
    });

    it('opens lyric editor on pause', function () {
      expect(wrapper.instance().state.displayEditor).to.be.false;
      wrapper.instance().togglePlayState();
      expect(wrapper.instance().state.displayEditor).to.be.true;
    });

    it('can play segment under edit from the Lyric Editor', function (done) {
      this.timeout(5000);
      expect(wrapper.instance().state.isPlaying).to.be.false;

      wrapper.instance().setState({
        segmentStart: 8,
        segmentEnd: 10,
        editMode: true, // todo: move elsewhere
      });

      wrapper.find(LyricEditor).get(0).props.playLyric();
      setTimeout(function () {
        expect(wrapper.instance().state.isPlaying).to.be.true;
        expect(wrapper.instance().state.currentTime).to.equal(9);
      }, 1500);

      setTimeout(function () {
        expect(wrapper.instance().state.currentTime).to.equal(11);
        expect(wrapper.instance().state.isPlaying).to.be.false;
        done();
      }, 3500);
    });

    it('toggles play state on (space) keyboard event', function () {
      wrapper.instance().setState({ displayEditor: false });
      expect(wrapper.instance().state.isPlaying).to.be.false;
      // const event = new window.KeyboardEvent('keyup', { keyCode: 32 });
      // document.dispatchEvent(event);
      wrapper.instance().onKeyUp({ keyCode: 32 });
      expect(wrapper.instance().state.isPlaying).to.be.true;

      wrapper.instance().onKeyUp({ keyCode: 33 });
      expect(wrapper.instance().state.isPlaying).to.be.true;

      wrapper.instance().onKeyUp({ keyCode: 32 });
      expect(wrapper.instance().state.isPlaying).to.be.false;
    });

    it('does not toggle on keyboard event when edit dialog is open', function () {
      expect(wrapper.instance().state.isPlaying).to.be.false;
      // which means dialog should be open

      wrapper.instance().onKeyUp({ keyCode: 32 });
      expect(wrapper.instance().state.isPlaying).to.be.false;
    });

    it('can use editor even after editing old lyric');

    it('keeps time markers consistent while editing an old lyric', function (done) {
      this.timeout(3000);
      const lineData = {
        text: 'whatever you want from me',
        startTime: 35,
        endTime: 40,
      };

      wrapper.instance().showEditDialog(lineData);

      wrapper.instance().handleResume();
      setTimeout(function () {
        wrapper.instance().handlePaused();
        expect(wrapper.instance().state.segmentStart).to.equal(lineData.startTime);
        expect(wrapper.instance().state.segmentEnd).to.equal(lineData.endTime);
        done();
      }, 2000);
    });

    it('forbids timemark from going below zero', function () {
      const startTime = wrapper.instance().state.segmentStart;
      for (let i = 0; i < (startTime + 5); i += 1) {
        wrapper.instance().decrementTime('segmentStart');
        expect(wrapper.instance().state.segmentStart).to.be.at.least(0);
      }

      for (let i = 0; i < 5; i += 1) {
        wrapper.instance().decrementTime('segmentStart');
        expect(wrapper.instance().state.segmentStart).to.be.equal(0);
      }
    });

    it('forbids timemark from going above max time', function () {
      const endTime = wrapper.instance().state.segmentEnd;
      for (let i = endTime; i < (audioDuration + 10); i += 1) {
        wrapper.instance().incrementTime('segmentEnd');
        expect(wrapper.instance().state.segmentEnd).to.be.at.most(audioDuration + 1);
      }

      for (let i = 0; i < 5; i += 1) {
        wrapper.instance().incrementTime('segmentEnd');
        expect(wrapper.instance().state.segmentEnd).to.be.equal(audioDuration);
      }
    });

    it('forbids start time from ever coming after end time');

    describe('DOM interaction', function () {
      xit('displays control bar!!!');

      it('control bar affixed to top when scrolled past "affix point"', function () {
        expect(wrapper.find('.info-bar').hasClass('affix')).to.be.false;

        wrapper.instance().affixPoint = 100;

        scrollY = 102;
        wrapper.instance().onScroll();

        expect(wrapper.find('.info-bar').hasClass('affix')).to.be.true;
      });

      it('control bar disapears when scrolling back to top', function () {
        expect(wrapper.find('.info-bar').hasClass('affix')).to.be.true;

        scrollY = 98;
        wrapper.instance().onScroll();

        expect(wrapper.find('.info-bar').hasClass('affix')).to.be.false;
      });

      it('control bar stays way, when scrolling is still above fixed point', function () {
        expect(wrapper.find('.info-bar').hasClass('affix')).to.be.false;

        scrollY = 90;
        wrapper.instance().onScroll();

        expect(wrapper.find('.info-bar').hasClass('affix')).to.be.false;
      });
    });
  });

  it('should be able to handle empty song fields');
});
