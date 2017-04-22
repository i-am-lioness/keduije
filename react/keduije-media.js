/* global YT, */
const mediaTypes = {
  AUDIO: 0,
  VIDEO: 1,
};

class Media {
  constructor(type, media) {
    this.type = type;
    this.media = media;

    this._play = ['play', 'playVideo'];
    this._pause = ['pause', 'pauseVideo'];
  }

  play() {
    this.media[this._play[this.type]]();
  }

  pause() {
    this.media[this._pause[this.type]]();
  }

  getCurrentTime() {
    let currentTime;
    if (this.type === mediaTypes.VIDEO) {
      currentTime = this.media.getCurrentTime();
    } else {
      currentTime = this.media.currentTime;
    }
    return currentTime;
  }

  seekTo(pos, buffer) {
    if (this.type === mediaTypes.VIDEO) {
      this.media.seekTo(pos, buffer);
    } else {
      this.media.currentTime = pos;
    }
  }

  getDuration() {
    let duration;
    if (this.type === mediaTypes.VIDEO) {
      duration = this.media.getDuration();
    } else {
      duration = this.media.duration;
    }
    return duration;
  }
}

class Video extends Media {
  constructor(iframe, onPlayerReady, handlePaused, handleResume) {
    super(mediaTypes.VIDEO, null);
    const video = new YT.Player(
      iframe,
      { events: {
        onReady: onPlayerReady,
        onStateChange: this.onPlayerStateChange.bind(this),
      },
      }
    );
    this.media = video;
    this.handlePaused = handlePaused;
    this.handleResume = handleResume;
  }
  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PAUSED) {
      this.handlePaused();
    } else if (event.data === YT.PlayerState.PLAYING) {
      this.handleResume();
    }
  }
}

class Audio extends Media {
  constructor(audio, playerReadyHandler, pausedHandler, resumeHandler) {
    super(mediaTypes.AUDIO, audio);

    audio.oncanplay = playerReadyHandler;
    audio.onpause = pausedHandler;
    audio.onplay = resumeHandler;
    audio.load();
  }
}

export { mediaTypes, Audio, Video };
