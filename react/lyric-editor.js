
      class LyricEditor extends React.Component {
        constructor(props) {
          super(props); //value, holdTimeMarkers, displayed, originalText, editMode, mode, close, handleToggleEditMode, saveLyric

          this.dialogWidth = 500;
          this.handleSubmit = this.handleSubmit.bind(this);
          this.calculateTail = this.calculateTail.bind(this);

        }

        componentDidUpdate(prevProps, prevState){
          if((!prevProps.displayed)&&(this.props.displayed))
            $( this.lyricEditor ).draggable();
        }

        handleSubmit(event) {
          event.preventDefault();
          this.props.saveLyric();
        }

        calculateTail(){
          var tailWidth = 30;
          this.dialogWidth = $(this.lyricEditor).outerWidth() || this.dialogWidth || 500;
          var offset = this.dialogWidth * this.props.percentage;
          var rightX = offset;
          var leftX =  offset + tailWidth;
          var bottomX = offset + 20;


          var points = leftX + ",0 "
                      + rightX + ",0 "
                      + bottomX + ",50";

          return (points || "");
        }

        render () {

          var btnText = (this.props.mode=="add") ? "Add" : "Update";
          var originalText = this.props.originalText ? <div className="originalText">{this.props.originalText}</div> : null;
          var editSwitchText = (this.props.editMode) ? "Done Editing" : "Edit";
          var dialog = this.props.displayed && <form id="lyricEditor" ref={(el)=> {this.lyricEditor = el}} className="editor-bg-color kezie-editor" onSubmit={this.handleSubmit}><div className="row">
            <div className="col-md-12">
              {originalText}
              <input id="lyric" className="editor-input" type="text" placeholder="Transcibe Lyrics..." value={this.props.value} onChange={this.props.handleChange} />
            </div>
          </div>
          <div className="row">
            <div className="col-md-5">
              <TimeSpinner
                className="col-md-5"
                id="start-spinner"
                variableName="segmentStart"
                label="From"
                seconds={this.props.segmentStart}
                increment={this.props.incrementTime}
                decrement={this.props.decrementTime}
              />
            </div>
            <div className="col-md-5">
              <TimeSpinner
                className="col-md-5"
                id="end-spinner"
                variableName="segmentEnd"
                label="To"
                seconds={this.props.segmentEnd}
                increment={this.props.incrementTime}
                decrement={this.props.decrementTime}
              />
            </div>
            <div className="col-md-2">
              <a id="playLyric" type="button" className="btn btn-default btn-lg" title="play" onClick={this.props.playLyric}>
                <span className="glyphicon glyphicon-play" aria-hidden="true"></span>
              </a>
            </div>
          </div>
          <div className="row">
            <div className="col-md-3">
              <button id="cancel-dialog-btn" className="btn btn-default btn-lg" type="reset" onClick={this.props.close}>Cancel</button>
            </div>
            <div className="col-md-9">
              <button id="save-lyric-btn" className="btn btn-default btn-lg" type="submit">{btnText}</button>
            </div>
          </div>
          <svg id="tail">
            <polygon points={this.calculateTail()} className="editor-bg-color"></polygon>
          </svg></form>;

          return <div>

          {this.props.editMode && dialog}
          </div>;

        }
      }
