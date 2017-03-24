
      class SongEditor extends React.Component {
        constructor(props) {
          super(props);

          this.state = {
            title: "",
            artist: ""
          };

          this.handleTitleChange = this.handleTitleChange.bind(this);
          this.handleArtistChange = this.handleArtistChange.bind(this);
          this.handleSubmit = this.handleSubmit.bind(this);

        }

        handleSubmit(event) {
          event.preventDefault();
          this.props.onSubmit({
            title: this.state.title,
            artist: this.state.artist
          });
        }

        handleTitleChange(e){
          this.setState({title: e.target.value});
        }

        handleArtistChange(e){
          this.setState({artist: e.target.value});
        }

        componentWillReceiveProps(nextProps){
          if((nextProps.isOpen) && (!this.props.isOpen)){
            var nextState = this.props.populateSongInfoForm();
            console.log(nextState);
            this.setState(nextState);
          }
        }

        render () {

          var dialog = this.props.isOpen && <form id="songEditor" ref="songEditor" className="editor-bg-color kezie-editor" onSubmit={this.handleSubmit}>
          <div className="row">
            <div className="col-md-12">
              <input id="titleInput" className="editor-input" type="text" placeholder="Song Title" value={this.state.title} onChange={this.handleTitleChange} />
            </div>

            <div className="col-md-12">
              <input id="artistInput" className="editor-input"  type="text" placeholder="Artist" value={this.state.artist} onChange={this.handleArtistChange} />
            </div>
          </div>
          <div className="row">
            <div className="col-md-3">
              <button id="cancel-dialog-btn" className="btn btn-default btn-lg" type="reset" onClick={this.props.onCancel}>Cancel</button>
            </div>
            <div className="col-md-9">
              <button id="save-lyric-btn" className="btn btn-default btn-lg" type="submit" onClick={this.handleSubmit}>Save</button>
            </div>
          </div>
          </form>;

          return dialog;

        }
      }
