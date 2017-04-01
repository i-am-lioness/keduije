
      class SongInfoForm extends React.Component {
        constructor(props) {
          super(props);

          this.resetState = {
            images: new Set(this.props.img ? [this.props.img]: null),
            title: "",
            artist: "",
            url: "",
            img: "",
            videoID: ""
          };
          this.state = this.resetState;

          this.handleClick = this.handleClick.bind(this);
          this.eachImage = this.eachImage.bind(this);
          this.search = this.search.bind(this);
          this.queryYoutube = this.queryYoutube.bind(this);
          this.displayVideoInfo = this.displayVideoInfo.bind(this);
          this.handleInput = this.handleInput.bind(this);
          this.handleSubmit = this.handleSubmit.bind(this);
        }

        handleSubmit(e){
          e.preventDefault();

          if(this.props.newSong){
            e.target.submit();
          }else{
            this.props.onSubmit({
              title: this.state.title || this.props.title,
              artist: this.state.artist || this.props.title,
              img: this.state.img || this.props.img
            });
            this.setState(this.resetState);
          }
        }

        handleClick(src){
          this.setState({
            img: src
          });
        }

        handleInput(e){
          const value = e.target.value;
          const name = e.target.name;

          this.setState({
            [name]: value
          });
        }

        eachImage(src){
          var selectedClass = (this.state.img == src)? " selected" : "";
          return <a href="#" key={src} className={"thumbnail " + selectedClass} onClick={this.handleClick.bind(this, src)}>
                  <img src={src} alt="..." />
              </a>;
        }

        search(e){
          var q = e.currentTarget.value;
          if(!q) return;

          $.get("https://api.spotify.com/v1/search", {type: "track", "q": q},function(data){
              console.log(data);

              var images = data.tracks.items.map(function (el){
                return el.album.images[0].url;
                });

              var originalImages = Array.from(this.state.images);
              this.setState({
                images: new Set(images.concat(originalImages))
              })

            }.bind(this));
        }

        queryYoutube(e){
          var q = getIDFromURL(e.target.value);
          if(!q) return;
          var request = gapi.client.youtube.videos.list({
            id: q,
            part: 'snippet'
          });

          request.execute(function(response) {
            if(response.items){
              this.displayVideoInfo(response.items[0]);
            }
          }.bind(this));
        }

        displayVideoInfo(res){
          var video = res.snippet;
          this.setState({
            title: video.title,
            videoID: res.id
          });

          var tns=video.thumbnails;

          var images = Array.from(this.state.images);
          images.push(tns.medium.url);
          this.setState({
            images: new Set(images)
          })
        }

        render () {

          return <form id="new-song-form" className="editor-bg-color kezie-editor" method="post" onSubmit={this.handleSubmit}>
              <div className="row">
                <div className="col-md-12">
                  {this.props.newSong &&<div className="form-group">
                    <input onChange={this.handleInput} value={this.state.url} onBlur={this.queryYoutube} className="form-control input-lg" name="url" placeholder="Link to youtube video" />
                    <input value={this.state.videoID} id="video-id-input" name="videoID" type="hidden" />
                  </div>}
                  <div className="form-group">
                    <input onChange={this.handleInput} value={this.state.title || this.props.title}  className="form-control input-lg" onBlur={this.search} id="title-input" name="title" placeholder="Title"/>
                  </div>
                  <div className="form-group">
                    <input onChange={this.handleInput} value={this.state.artist || this.props.artist}  className="form-control input-lg" onBlur={this.search} id="artist-input" name="artist" placeholder="Artist" />
                  </div>
                  <div className="form-group">
                    <input type="hidden" onChange={this.handleInput} value={this.state.img}  className="form-control input-lg" id="art-url-input" name="img" placeholder="Artwork URL" />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-3">
                  <button id="cancel-dialog-btn" className="btn btn-default btn-lg" type="reset" onClick={this.props.onCancel}>Cancel</button>
                </div>
                <div className="col-md-9">
                  <button id="save-lyric-btn" className="btn btn-default btn-lg" type="submit">Save</button>
                </div>
              </div>

              <div className="images-container">{Array.from(this.state.images).map(this.eachImage)}</div>
            </form>;

        }
      }