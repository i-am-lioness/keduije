

      class MediaPlayer extends React.Component {
        constructor(props) {
          super(props); //type,
          this.state = {
            segmentStart: 0,
            segmentEnd: 0,
            currentTime: 0,
            displayEditor: false,
            originalText: "",
            text: "",
            editMode: false,
            editType: "add",
            lyrics: [],
            showEditDialog: false,
            editDialogIsOpen: false,
            isPlaying: false
          };

          this.maxTime = null;
          this.media = null;
          this.saveStartTime=false; //accounts for "jumping" around, rename to "holdStartTime"
          this.timeMarksFrozen = false; //todo: make sure to unfreeze
          this.timer;
          this.indexBeingModified = null;
          this.stopAtSegmentEnd = false;

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
          this.loadSongData = this.loadSongData.bind(this);
          this.displaySongInfo = this.displaySongInfo.bind(this);
          this.toggleSongInfoDialog = this.toggleSongInfoDialog.bind(this);
          this.saveSongInfo = this.saveSongInfo.bind(this);
          this.populateSongInfoForm = this.populateSongInfoForm.bind(this);
          this.togglePlayState = this.togglePlayState.bind(this);

        }

        showEditHeaderDialog(data){
          this.indexBeingModified = data;
          var headingText = prompt(data.heading ? "Update Heading" : "Please enter heading", data.heading || "[]");
          this.saveLyric(headingText)
        }

        handleTextChange(event) {
          this.setState({text: event.target.value});
        }

        saveLyric(headingText){
          if(this.indexBeingModified){

              var oldLyricObj = this.indexBeingModified;
              var newLyricObj = $.extend({}, oldLyricObj);
              if(headingText){
                newLyricObj.heading = headingText;
              } else {
                newLyricObj.text = this.state.text;
                newLyricObj.startTime = this.state.segmentStart;
                newLyricObj.endTime = this.state.segmentEnd;
              }

            KeduIje.updateLyric(oldLyricObj, newLyricObj, this.loadLyrics);

          }else {
            var newLyric = {
              text: this.state.text,
              endTime: this.state.segmentEnd,
              deleted: false,
              id: this.state.lyrics.length,
              startTime: this.state.segmentStart,
              heading: null
            };
            KeduIje.addLyric(newLyric, this.loadLyrics);
          }
          this.indexBeingModified = false;

        }

        handleToggleEditMode(){

          this.setState((prevState, props) => ({
            editMode: !prevState.editMode
          }));
        }

        showEditDialog(data){
          this.indexBeingModified = data;

          var mode = "add";
          var originalText = null;
          if(data.text){
            this.timeMarksFrozen = true;
            mode = "save";
            originalText = 'original: "' + data.text + '"';
          }

          this.setState({
            displayEditor: true,
            originalText: originalText,
            editType: mode,
            text: data.text,
            segmentStart: parseInt(data.startTime),
            segmentEnd: parseInt(data.endTime)
          });
        }

        close(){
          this.setState({
            displayEditor: false,
            originalText: null,
            editType: "add",
            text: null
          });

          this.timeMarksFrozen = false;
        }

        loadLyrics(lyrics){

          lyrics.sort(function(a, b){
            return parseInt(a.startTime)-parseInt(b.startTime);
          });

          this.setState({
            lyrics: lyrics,
            displayEditor: false,
            text: ""
          });
        }

        togglePlayState(){
          (this.state.isPlaying) ? this.media.pause() : this.media.play();
        }

        seekTo(percentage){
          var time = percentage * this.maxTime;
          this.setState({currentTime: time});
          this.media.seekTo(time);
        }

        onTimeout(){
          var currentTime = this.media.getCurrentTime();
          this.setState({currentTime: currentTime});

          //stop if playing a segment
          if(this.stopAtSegmentEnd && (currentTime > this.state.segmentEnd)){
            this.media.pause();
            this.stopAtSegmentEnd = false;
          }

        }

        onYouTubeIframeAPIReady() {
          if(this.props.mediaType!=KeduIje.mediaTypes.VIDEO) return; //todo: add sanity check here

          this.media= new KeduIje.Media(this.iframe, this.onPlayerReady, this.handlePaused, this.handleResume);
        }

        loadAudio(audio){
          this.audioElement = audio;
        }

        loadSongData(song){
          this.loadLyrics(song.lyrics || []);
          this.displaySongInfo(song);
        }


        componentDidMount(){
            KeduIje.loadLyrics(this.loadSongData);

            var affixStart = $(this.infoBar).offset().top;
            KeduIje.animations.affix(this.infoBar, affixStart);


            if(this.props.mediaType!=KeduIje.mediaTypes.AUDIO) return; //todo: add sanity check here
            this.media = new KeduIje.Audio(this.audioElement, this.onPlayerReady, this.handlePaused, this.handleResume);

        }

        onPlayerReady(event) {
          this.maxTime = this.media.getDuration();
        }

        handlePaused(){
          clearInterval(this.timer);
          this.setState({isPlaying: false});
          if(this.timeMarksFrozen) return; //revisit

          var segmentStart= this.state.segmentStart;
          var segmentEnd= this.state.segmentEnd;

          if(!this.saveStartTime){
            this.setState({
              segmentStart: segmentEnd
            });
            segmentStart = segmentEnd;
          }
          this.saveStartTime = false; //turn off switch
          segmentEnd = Math.floor(this.media.getCurrentTime());
          this.setState({
            segmentEnd: segmentEnd,
            displayEditor: true
          });

        }

        handleResume(){
          this.timer = setInterval(this.onTimeout,1000);
          this.setState({isPlaying: true});
        }

        jumpTo(start, end){

          this.setState({
            segmentStart: start,
            segmentEnd: end
          }, this.playSegment);

        }

        playSegment(stopAtSegmentEnd){
          this.media.seekTo(this.state.segmentStart,true);
          this.media.play();
          this.saveStartTime = true;
          this.stopAtSegmentEnd = stopAtSegmentEnd;
        }

        decrementTime(variableName){
          if(this.state[variableName]>0){
            this.setState((prevState, props) => {
              var newState = {};
              newState[variableName] = prevState[variableName] - 1;
              return newState;
            });
          }
        }

        incrementTime(variableName){
          if(this.state[variableName]<this.maxTime){
            this.setState((prevState, props) => {
              var newState = {};
              newState[variableName] = prevState[variableName] + 1;
              return newState;
            });
          }
        }

        toggleSongInfoDialog(value){
          this.setState({editDialogIsOpen: value? value : true }); //value
        }

        saveSongInfo(songInfo){
          KeduIje.saveSongInfo(songInfo, this.displaySongInfo);
        }

        displaySongInfo(songInfo){
          this.setState({
            title: songInfo.title || "",
            artist: songInfo.artist || "",
            editDialogIsOpen: false
          });
        }

        populateSongInfoForm(){
          return {
            title: this.state.title,
            artist: this.state.artist
          };
        }

        render () {
          var percentage=this.state.currentTime/this.maxTime;
          var mediaElement;

          if(this.props.mediaType==KeduIje.mediaTypes.AUDIO){
            mediaElement = <audio ref={this.loadAudio.bind(this)}>
              <source src={this.props.src} type="audio/mpeg" />;
            </audio>
                  ;
          }else {
            mediaElement = <div className = "show-on-play">
                <div className='embed-responsive embed-responsive-16by9'>
                  <iframe
                    ref={(iframe) => {this.iframe = iframe;}}
                    className='embed-responsive-item'
                    src={this.props.src}
                    frameBorder='0'
                  />
                </div>
              </div>;
          }

          return <div className="row">
            <div id="lyric-column" className="col-md-6 col-xs-12 col-md-offset-3">
              <div className="artwork" style={{backgroundImage: "url("+this.props.artworkSrc+")"}}>
                <div className="gradient"></div>
                <PlayControl
                  togglePlayState={this.togglePlayState}
                  isPlaying={this.state.isPlaying}
                />
                {this.props.canEdit && <button id="edit-mode-btn" type="button" className="button" onClick={this.handleToggleEditMode}>
                  <span className={"glyphicon glyphicon-pencil"} aria-hidden="true"></span> Edit
                </button>}
                <div className="song-info">
                  <p className="artist">{this.state.artist}</p>
                  <h1 className="title">{this.state.title}</h1>

                  {this.state.editMode && <a href="#" onClick={this.toggleSongInfoDialog.bind(this, true)}>(edit)</a>}
                </div>
              </div>
              {mediaElement}

              <div className="info-bar" ref={(el)=>{this.infoBar = el;}}>
                <p className="title">{this.state.title}</p>
                <p className="artist">{this.state.artist}</p>
                <PlayControl
                  togglePlayState={this.togglePlayState}
                  isPlaying={this.state.isPlaying}
                />
                <ProgressBar onSeekTo={this.seekTo} percentage={percentage}/>
              </div>
              <LyricDisplay
                lyrics={this.state.lyrics}
                currentTime={this.state.currentTime}
                editMode={this.state.editMode}
                jumpTo={this.jumpTo}
                showEditDialog={this.showEditDialog}
                showEditHeaderDialog={this.showEditHeaderDialog}
                />
                <SongEditor
                  isOpen={this.state.editDialogIsOpen}
                  onSubmit={this.saveSongInfo}
                  title={this.state.title}
                  artist={this.state.artist}
                  onCancel={this.toggleSongInfoDialog.bind(this, false)}
                  populateSongInfoForm = {this.populateSongInfoForm}
                />
                {this.props.canEdit &&
                  <LyricEditor
                    ref={this.props.registerEditor}
                    segmentStart={this.state.segmentStart}
                    segmentEnd={this.state.segmentEnd}
                    incrementTime={this.incrementTime}
                    decrementTime={this.decrementTime}
                    percentage={percentage || 0}
                    playLyric = {this.playSegment.bind(this, true)}
                    displayed = {this.state.displayEditor}
                    originalText = {this.state.originalText}
                    editMode = {this.state.editMode}
                    mode = {this.state.editType}
                    close = {this.close}
                    saveLyric = {this.saveLyric}
                    value = {this.state.text}
                    handleChange = {this.handleTextChange}
                    />}
            </div>
          </div>;

        }
      }
