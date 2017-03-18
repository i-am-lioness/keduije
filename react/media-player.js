
      class MediaPlayer extends React.Component {
        constructor(props) {
          super(props); //type,
          this.state = {
            //currentTime: 0
          };

          this.currentTime = 0;
          this.segmentStart=0; //todo: make state
          this.segmentEnd=0;
          this.maxTime = null;
          this.player = null;
          this.saveStartTime=false; //accounts for "jumping" around, rename to "holdStartTime"
          this.timeMarksFrozen = false; //todo: make sure to unfreeze

          this.onYouTubeIframeAPIReady = this.onYouTubeIframeAPIReady.bind(this);
          this.onPlayerReady = this.onPlayerReady.bind(this);
          this.freezeTimeMarks = this.freezeTimeMarks.bind(this);
          this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
          this.playSegment = this.playSegment.bind(this);
          this.checkForSegmentEnd = this.checkForSegmentEnd.bind(this);
          this.isPlaying = this.isPlaying.bind(this);
          this.getCurrentTime = this.getCurrentTime.bind(this);

        }

        onYouTubeIframeAPIReady() {
          var iframe = $("iframe.embed-responsive-item")[0]; //revisit
          this.player = new YT.Player(iframe, {
            events: {
              'onReady': this.onPlayerReady,
              'onStateChange': this.onPlayerStateChange
            }
          });
        }

        onPlayerReady(event) {
          this.maxTime = this.player.getDuration();
        }

        freezeTimeMarks(){
          this.timeMarksFrozen = true;
        }


        onPlayerStateChange(event) {
          if (event.data == YT.PlayerState.PAUSED) {
            if(this.timeMarksFrozen) return; //revisit

            this.segmentStart = this.saveStartTime? this.segmentStart : this.segmentEnd;
            this.saveStartTime = false; //turn off switch
            this.segmentEnd = Math.floor(this.player.getCurrentTime());

            this.onPaused(this.segmentStart, this.segmentEnd);

          }else if (event.data == YT.PlayerState.PLAYING) {

            this.onResume();

          }
        }

        playSegment(){
          this.player.seekTo(this.segmentStart,true);
          this.player.playVideo();
          this.saveStartTime = true;
          if(this.segmentEnd>-1)
            setTimeout(this.checkForSegmentEnd,1000);
        }

        checkForSegmentEnd(){
          this.currentTime = this.player.getCurrentTime();
          if (this.currentTime > this.segmentEnd){
            this.player.pauseVideo();
          }else {
            setTimeout(this.checkForSegmentEnd, 1000);
          }
        }

        isPlaying(){
          return (this.player.getPlayerState()==YT.PlayerState.PLAYING);
        }
        getCurrentTime(){
          this.currentTime = this.player.getCurrentTime(); //extract method
          return this.currentTime;
        }
        render () {
          return null;

        }
      }
