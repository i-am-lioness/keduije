
      class LyricEditor extends React.Component {
        constructor(props) {
          super(props);
          this.state = {
            value: '',
            originalText: "",
            mode: "add" /*update or add*/,
            displayed: true,
            editMode: false
          };

          this.dialogWidth = 500;
          this.handleChange = this.handleChange.bind(this);
          this.handleSubmit = this.handleSubmit.bind(this);
          this.calculateTail = this.calculateTail.bind(this);
          this.close = this.close.bind(this);
          this.handleToggleEditMode = this.handleToggleEditMode.bind(this);

        }

        handleToggleEditMode(){
          this.setEditMode(!this.state.editMode);

          this.setState((prevState, props) => ({
            editMode: !prevState.editMode
          }));
        }

        handleChange(event) {
          this.setState({value: event.target.value});
        }

        close(){
          this.setState({
            value: "",
            displayed: false,
            originalText: null,
            mode: "add"
          });

          //unfreeze time markers
          this.props.holdTimeMarkers(false);
        }

        handleSubmit(event) {
          event.preventDefault();
          this.saveLyric(this.state.value);
        }

        show(text){
          var mode = "add";
          var originalText = null;
          var value = this.state.value || "";
          if(text){
            this.props.holdTimeMarkers(true);
            mode = "save";
            originalText = 'original: "' + text + '"';
            value = text;
          }
          this.setState({
            displayed: true,
            originalText: originalText,
            value: value,
            mode: mode
          });
        }

        calculateTail(){
          var tailWidth = 30;
          this.dialogWidth = $(this.refs.lyricEditor).outerWidth() || this.dialogWidth || 500;
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

          var btnText = (this.state.mode=="add") ? "Add" : "Update";
          var originalText = this.state.originalText ? <div className="originalText">{this.state.originalText}</div> : null;
          var editSwitchText = (this.state.editMode) ? "Done Editing" : "Edit";
          var dialog = this.state.displayed && <form id="lyricEditor" ref="lyricEditor" className="editor-bg-color" onSubmit={this.handleSubmit}><div className="row">
            <div className="col-md-12">
              {originalText}
              <input id="lyric" type="text" placeholder="Transcibe Lyrics..." value={this.state.value} onChange={this.handleChange} />
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
              <button id="cancel-dialog-btn" className="btn btn-default btn-lg" type="reset" onClick={this.close}>Cancel</button>
            </div>
            <div className="col-md-9">
              <button id="save-lyric-btn" className="btn btn-default btn-lg" type="submit">{btnText}</button>
            </div>
          </div>
          <svg id="tail">
            <polygon points={this.calculateTail()} className="editor-bg-color"></polygon>
          </svg></form>;

          return <div>
          <button id="edit-mode-btn" type="button" className="btn btn-default btn-lg" onClick={this.handleToggleEditMode}>{editSwitchText}</button>
          {this.state.editMode && dialog}
          </div>;

        }
      }
