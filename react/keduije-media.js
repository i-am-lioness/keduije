/* global YT, */
const KeduIjeMedia = ((ki) => {
  class Media { // todo: combine both classes
    constructor(iframe, onPlayerReady, handlePaused, handleResume) {
      this.video = new YT.Player(
        iframe,
        { events: {
          onReady: onPlayerReady,
          onStateChange: this._onPlayerStateChange.bind(this),
        },
        }
      );

      this.handlePaused = handlePaused;
      this.handleResume = handleResume;
    }
    _onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.PAUSED) {
        this.handlePaused();
      } else if (event.data === YT.PlayerState.PLAYING) {
        this.handleResume();
      }
    }

    play() {
      this.video.playVideo();
    }
    pause() {
      this.video.pauseVideo();
    }

    getCurrentTime() {
      return this.video.getCurrentTime();
    }

    seekTo(pos, buffer) {
      this.video.seekTo(pos, buffer);
    }

    getDuration() {
      return this.video.getDuration();
    }
  }

  class Audio {
    constructor(audio, playerReadyHandler, pausedHandler, resumeHandler) {
      this.audio = audio;
      this.audio.oncanplay = playerReadyHandler;
      this.audio.onpause = pausedHandler;
      this.audio.onplay = resumeHandler;
      this.audio.load();
    }
    play() {
      this.audio.play();
    }
    pause() {
      this.audio.pause();
    }

    getCurrentTime() {
      return this.audio.currentTime;
    }

    seekTo(pos, buffer) {
      this.audio.currentTime = pos;
    }

    getDuration() {
      return this.audio.duration;
    }
  }

  ki.mediaTypes = {
    AUDIO: 0,
    VIDEO: 1,
  };

  ki.Media = Media;
  ki.Audio = Audio;

  return ki;
})({});

// export default KeduIjeMedia;
module.exports = KeduIjeMedia;

