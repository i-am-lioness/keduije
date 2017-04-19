/* eslint-env browser */
import React from 'react';
import PropTypes from 'prop-types';

import KeduIje, { editModes } from '../keduije';
import { mediaTypes, Media, Audio } from '../keduije-media';
import { loadYoutubeIFrameAPI } from '../keduije-util';
import LyricDisplay from './lyric-display';
import LyricEditor from './lyric-editor';
import SongInfoForm from './song-info-form';
import ProgressBar from './progress-bar';
import PlayControl from './play-control';
import EditSwitch from './edit-switch';

class MediaPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      segmentStart: 0,
      segmentEnd: 0,
      currentTime: 0,
      displayEditor: false,
      originalText: '',
      text: '',
      editMode: false,
      editType: null,
      lyrics: [],
      showEditDialog: false,
      editDialogIsOpen: false,
      isPlaying: false,
      videoPlaybackMode: false,
      affixed: false,
      img: this.props.img,
      mediaID: this.props.mediaID,
      title: this.props.title,
      artist: this.props.artist,
      slug: this.props.slug,
    };

    /* this.originalSongInfo = { // todo: may need to have whole copy of media Object as in db
      img: this.props.img,
      title: this.props.title,
      artist: this.props.artist,
    };

    this.historyLink = `/music/${this.props.slug}/history`; // consider making state
*/
    this.maxTime = null;
    this.media = null;
    this.saveStartTime = false; // accounts for "jumping" around, rename to "holdStartTime"
    this.timeMarksFrozen = false;
    this.lyricBeingEdited = null;
    this.stopAtSegmentEnd = false;
    this.originalSongInfo = null;
    this.historyLink = '';
    this.mediaLoaded = false;

    this.onYouTubeIframeAPIReady = this.onYouTubeIframeAPIReady.bind(this);
    this.onPlayerReady = this.onPlayerReady.bind(this);
    this.playSegment = this.playSegment.bind(this);
    this.incrementTime = this.incrementTime.bind(this);
    this.decrementTime = this.decrementTime.bind(this);
    this.handlePaused = this.handlePaused.bind(this);
    this.seekTo = this.seekTo.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.handleResume = this.handleResume.bind(this);
    this.showEditDialog = this.showEditDialog.bind(this);
    this.saveLyric = this.saveLyric.bind(this);
    this.loadLyrics = this.loadLyrics.bind(this);
    this.jumpTo = this.jumpTo.bind(this);
    this.close = this.close.bind(this);
    this.handleToggleEditMode = this.handleToggleEditMode.bind(this);
    this.handleTextChange = this.handleTextChange.bind(this);
    this.showEditHeaderDialog = this.showEditHeaderDialog.bind(this);
    this.displaySongInfo = this.displaySongInfo.bind(this);
    this.toggleSongInfoDialog = this.toggleSongInfoDialog.bind(this);
    this.saveSongInfo = this.saveSongInfo.bind(this);
    this.togglePlayState = this.togglePlayState.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.updateIfChanged = this.updateIfChanged.bind(this);
    this.setEditMode = this.setEditMode.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.deleteThisSong = this.deleteThisSong.bind(this);
  }

  showEditHeaderDialog(data) {
    this.lyricBeingEdited = data;
    const defaultValue = '[]';
    const headingText = prompt(data.heading ? 'Update Heading' : 'Please enter heading', data.heading || defaultValue);
    if (headingText && (headingText !== defaultValue)) { this.saveLyric(headingText); }
  }

  handleDelete(e) {
    const r = confirm(`Are you sure you want to delete '${this.state.originalText}'?`);
    if (r === true) {
      KeduIje.deleteLyric(this.lyricBeingEdited, this.loadLyrics);
    }
  }

  handleTextChange(event) {
    this.setState({ text: event.target.value });
  }

  updateIfChanged(obj, field, stateName) {
    if (this.state[stateName].toString() !== this.lyricBeingEdited[field]) {
      obj[field] = this.state[stateName];
    }
  }

  saveLyric(headingText) {
    if (this.lyricBeingEdited) {
      const lyricChanges = {};
      if (headingText) {
        lyricChanges.heading = headingText;
      } else {
        this.updateIfChanged(lyricChanges, 'text', 'text');
        this.updateIfChanged(lyricChanges, 'startTime', 'segmentStart');
        this.updateIfChanged(lyricChanges, 'endTime', 'segmentEnd');
      }

      // to do: [semantics] back a "refresh" instead
      KeduIje.updateLyric(this.lyricBeingEdited, lyricChanges, this.loadLyrics);
    } else {
      const newLyric = {
        text: this.state.text,
        endTime: this.state.segmentEnd,
        deleted: false,
        startTime: this.state.segmentStart,
        heading: null,
      };
      KeduIje.addLyric(newLyric, this.loadLyrics);
    }
    this.lyricBeingEdited = null;
  }

  handleToggleEditMode() {
    const newEditMode = !this.state.editMode;
    KeduIje.startEditSession(newEditMode, this.setEditMode);
  }

  setEditMode(newEditMode) {
    this.setState({ editMode: newEditMode });
  }

  showEditDialog(data) {
    this.lyricBeingEdited = data;

    // TODO: consider making sure that data has text
    this.timeMarksFrozen = true;
    const originalText = `original: "${data.text}"`;

    this.setState({
      displayEditor: true,
      originalText: originalText,
      editType: editModes.UPDATE,
      text: data.text,
      segmentStart: parseInt(data.startTime, 10),
      segmentEnd: parseInt(data.endTime, 10),
    });
  }

  close() {
    this.setState({
      displayEditor: false,
      originalText: null,
      editType: null,
      text: '',
    });

    this.timeMarksFrozen = false;
  }

  loadLyrics(lyrics) {
    lyrics.sort((a, b) => parseInt(a.startTime, 10) - parseInt(b.startTime, 10));

    // to do: make a state reset object
    this.setState({
      lyrics: lyrics,
      displayEditor: false,
      text: '',
      originalText: null,
      editType: null,
    });

    this.timeMarksFrozen = false;
  }

  togglePlayState() {
    if (this.state.isPlaying) {
      this.media.pause();
    } else {
      this.media.play();
    }
  }

  seekTo(percentage) { // to do: reimpliment as a "jumpTo" wrapper
    const time = percentage * this.maxTime;
    this.setState({ currentTime: time });
    this.media.seekTo(time);
  }

  onTimeout() {
    const currentTime = this.media.getCurrentTime();
    this.setState({ currentTime: currentTime });

    // stop if playing a segment
    if (this.stopAtSegmentEnd && (currentTime > this.state.segmentEnd)) {
      this.media.pause();
      this.stopAtSegmentEnd = false;
    }
  }

  onYouTubeIframeAPIReady() {
    // todo: consider doing a sanity check here

    this.media = new Media(
      this.iframe,
      this.onPlayerReady,
      this.handlePaused,
      this.handleResume);
  }

  onScroll(e) {
    if ((!this.state.affixed) && (scrollY > this.affixPoint)) {
      this.setState({ affixed: true });
    } else if ((this.state.affixed) && (scrollY < this.affixPoint)) {
      this.setState({ affixed: false });
    }
  }

  componentDidMount() {
    KeduIje.init(this.state.mediaID);
    KeduIje.loadLyrics(this.loadLyrics);
    KeduIje.loadSongInfo(this.displaySongInfo);

    this.affixPoint = this.artwork.offsetTop + this.artwork.offsetHeight;

    window.onkeyup = this.onKeyUp;
    window.onscroll = this.onScroll;

    // todo: consider adding sanity check here, or swapping
    if (this.props.mediaType === mediaTypes.AUDIO) {
      this.media = new Audio(
        this.audioElement,
        this.onPlayerReady,
        this.handlePaused,
        this.handleResume);
    } else { // (this.props.mediaType === mediaTypes.VIDEO)
      loadYoutubeIFrameAPI(this.onYouTubeIframeAPIReady);
    }
  }

  onPlayerReady(event) {
    this.maxTime = this.media.getDuration();
    this.mediaLoaded = true;
  }

  handlePaused() {
    clearInterval(this.timer);
    this.setState({ isPlaying: false });
    if (this.timeMarksFrozen) return; // revisit

    const segmentStart = this.saveStartTime ? this.state.segmentStart : this.state.segmentEnd;
    const segmentEnd = Math.floor(this.media.getCurrentTime());
    this.saveStartTime = false; // turn off switch

    this.setState({
      segmentStart: segmentStart,
      segmentEnd: segmentEnd,
      displayEditor: true,
      editType: editModes.ADD,
    });
  }

  handleResume() {
    this.timer = setInterval(this.onTimeout, 1000);
    this.setState({ isPlaying: true });
    if ((!this.state.videoPlaybackMode) &&
      (this.props.mediaType === mediaTypes.VIDEO)) {
      this.setState({ videoPlaybackMode: true });
    }
  }

  jumpTo(start, end) {
    this.setState({
      segmentStart: start,
      segmentEnd: end,
    }, this.playSegment);
  }

  playSegment(stopAtSegmentEnd) {
    this.media.seekTo(this.state.segmentStart, true);
    this.media.play();
    this.saveStartTime = true;
    this.stopAtSegmentEnd = stopAtSegmentEnd;
  }

  decrementTime(variableName) {
    if (this.state[variableName] > 0) {
      this.setState((prevState, props) => {
        const newState = {};
        newState[variableName] = prevState[variableName] - 1;
        return newState;
      });
    }
  }

  incrementTime(variableName) {
    // todo: consider handling if maxTime not set (in case where media is not loaded)
    if (this.state[variableName] < (this.maxTime || Infinity)) {
      this.setState((prevState, props) => {
        const newState = {};
        newState[variableName] = prevState[variableName] + 1;
        return newState;
      });
    }
  }

  toggleSongInfoDialog(value) {
    this.setState({ editDialogIsOpen: value });
  }

  saveSongInfo(songInfo) {
    KeduIje.saveSongInfo(this.originalSongInfo, songInfo, this.displaySongInfo);
  }

  deleteThisSong() {
    KeduIje.deleteSong(this.originalSongInfo);
  }

  displaySongInfo(songInfo) {
    this.originalSongInfo = songInfo;
    this.historyLink = `/music/${songInfo.slug}/history`;// consider making state
    this.setState({
      title: songInfo.title || '',
      artist: songInfo.artist || '',
      img: songInfo.img || '',
      editDialogIsOpen: false,
    });
  }

  onKeyUp(e) {
    if ((e.keyCode === 32) && (this.state.editMode)) { // space
      if ((!this.state.displayEditor) && (!this.state.editDialogIsOpen)) { this.togglePlayState(); }
    }

    // this.playSegment(true);
  }

  render() {
    const percentage = (this.state.currentTime / this.maxTime) || 0;
    let mediaElement = null;

    if (this.props.mediaType === mediaTypes.AUDIO) {
      mediaElement = (<audio ref={(audio) => { this.audioElement = audio; }}>
        <source src={this.props.src} type="audio/mpeg" />
      </audio>);
    } else {
      const iframeClass = this.state.videoPlaybackMode ? '' : ' hidden-video';
      mediaElement = (<div className={`embed-responsive embed-responsive-16by9${iframeClass}`}>
        <iframe
          ref={(iframe) => { this.iframe = iframe; }}
          className="embed-responsive-item"
          src={this.props.src}
          frameBorder="0"
        />
      </div>);
    }

    let affixed = '';
    let progressBarLayout = 'bottom';
    if (this.state.videoPlaybackMode) {
      affixed = 'hold';
      progressBarLayout = 'top';
    } else if (this.state.affixed) {
      affixed = 'affix';
    }

    const infoBar = (<div className={`info-bar ${affixed}`}>
      <p className="title">{this.state.title}</p>
      <p className="artist">{this.state.artist}</p>
      <PlayControl
        togglePlayState={this.togglePlayState}
        isPlaying={this.state.isPlaying}
      />
      {this.props.canEdit && (<EditSwitch
        toggleEditMode={this.handleToggleEditMode}
        editMode={this.state.editMode}
      />)}
      <ProgressBar onSeekTo={this.seekTo} percentage={percentage} layout={progressBarLayout} />
    </div>);

    const artwork = (<div key="artwork" ref={(el) => { this.artwork = el; }} className="artwork" style={{ backgroundImage: `url(${this.state.img})` }}>
      <div className="gradient" />
      <PlayControl
        togglePlayState={this.togglePlayState}
        isPlaying={this.state.isPlaying}
      />
      <ProgressBar onSeekTo={this.seekTo} percentage={percentage} />
      {this.props.canEdit && (<EditSwitch
        toggleEditMode={this.handleToggleEditMode}
        editMode={this.state.editMode}
      />)}
      <div className="song-info">
        <p className="artist">{this.state.artist}</p>
        <h1 className="title">{this.state.title}</h1>

        {this.state.editMode && (<a
          id="edit-song-info-btn"
          href="#"
          onClick={(e) => { this.toggleSongInfoDialog(true, e); }}
        >(edit)</a>)}
        {this.props.canEdit && <a href={this.historyLink}>(history)</a>}
      </div>
    </div>);

    const editors = this.props.canEdit && <div>
      {this.state.editDialogIsOpen && <SongInfoForm
        onSubmit={this.saveSongInfo}
        title={this.state.title}
        artist={this.state.artist}
        onCancel={(e) => { this.toggleSongInfoDialog(false, e); }}
        img={this.state.img}
        onRemove={this.deleteThisSong}
      />}
      <LyricEditor
        segmentStart={this.state.segmentStart}
        segmentEnd={this.state.segmentEnd}
        incrementTime={this.incrementTime}
        decrementTime={this.decrementTime}
        percentage={percentage || 0}
        playLyric={(e) => { this.playSegment(true, e); }}
        displayed={this.state.displayEditor}
        originalText={this.state.originalText}
        editMode={this.state.editMode}
        mode={this.state.editType}
        close={this.close}
        saveLyric={this.saveLyric}
        value={this.state.text}
        handleChange={this.handleTextChange}
        onDelete={this.handleDelete}
      />
      </div>;

    const classIfVideo = (this.state.videoPlaybackMode) ? ' video-lyrics' : '';
    return (<div className="row">
      <div id="lyric-column" className={`col-md-6 col-xs-12 col-md-offset-3 ${classIfVideo}`}>

        {this.state.videoPlaybackMode || artwork}
        {mediaElement}
        <LyricDisplay
          lyrics={this.state.lyrics}
          currentTime={this.state.currentTime}
          editMode={this.state.editMode}
          jumpTo={this.jumpTo}
          showEditDialog={this.showEditDialog}
          showEditHeaderDialog={this.showEditHeaderDialog}
          videoIsPlaying={this.state.videoPlaybackMode}
        />
        {infoBar}
        {editors}
      </div>
    </div>);
  }
}

MediaPlayer.defaultProps = {
  artist: '',
};

MediaPlayer.propTypes = {
  mediaType: PropTypes.oneOf(
    [mediaTypes.AUDIO, mediaTypes.VIDEO]).isRequired,
  canEdit: PropTypes.bool.isRequired,
  src: PropTypes.string.isRequired,
  mediaID: PropTypes.string.isRequired,
  img: PropTypes.string.isRequired,
  artist: PropTypes.string,
  title: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
};

export default MediaPlayer;
