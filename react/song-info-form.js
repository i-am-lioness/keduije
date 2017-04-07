
      class SongInfoForm extends React.Component {
        constructor(props) {
          super(props);

          this.resetState = {
            images: new Set(this.props.img ? [this.props.img]: null),
            title: {value: "", edited: false},
            artist: {value: "", edited: false},
            src: {value: "", edited: false},
            img: "",
            videoID: ""
          };
          this.state = this.resetState;

          this.ytThumbnail = null;

          this.handleClick = this.handleClick.bind(this);
          this.eachImage = this.eachImage.bind(this);
          this.search = this.search.bind(this);
          this.queryYoutube = this.queryYoutube.bind(this);
          this.displayVideoInfo = this.displayVideoInfo.bind(this);
          this.handleInput = this.handleInput.bind(this);
          this.handleSubmit = this.handleSubmit.bind(this);
          this.displayValue = this.displayValue.bind(this);
          this.addValue = this.addValue.bind(this);
        }

        addValue(obj, name){
          if(this.state[name].edited==true)
            obj[name]=this.state[name].value;
          else if (this.state[name].edited==false)
            return;
          else if(this.state[name])
            obj[name]=this.state[name];
          else if(name=="img" && this.ytThumbnail)
            obj["img"]=this.ytThumbnail;
        }

        handleSubmit(e){
          e.preventDefault();

          var updates={};
          for (var key in this.state) {
            if(key=="images") continue;
            if (this.state.hasOwnProperty(key)) {
              this.addValue(updates, key);
            }
          }

          if(this.props.newSong){
            //updates.status="published";
            updates.type=(this.state.videoID)? KeduIje.mediaTypes.VIDEO: KeduIje.mediaTypes.AUDIO;
          }

          this.props.onSubmit(updates);

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
            [name]: {value: value, edited: true}
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
          if(!q) {
            return this.setState({isAudio: true});
          };
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
            title: {value: video.title, edited: true},
            videoID: res.id
          });


          var tns=video.thumbnails;

          var images = Array.from(this.state.images);
          this.ytThumbnail = tns.medium.url;
          images.push(this.ytThumbnail);
          this.setState({
            images: new Set(images)
          })
        }

        displayValue(name){
          /*
          three states
          1 blank- for fresh new song
          2 original value - for fresh edit
          3 new value- for fresh edit
          4 new value- for new song

          */

          var value;

          if(this.state[name].edited){
            value = this.state[name].value;
          }else{
            value = this.props[name] || "";
          }

          return value;
        }

        render () {

          return <form id="new-song-form" className="editor-bg-color kezie-editor" onSubmit={this.handleSubmit}>
              <div className="row">
                <div className="col-md-12">
                  {this.props.newSong &&<div className="form-group">
                    <input onChange={this.handleInput} value={this.state.src.value} onBlur={this.queryYoutube} className="form-control input-lg" name="src" placeholder="Link to youtube video" />
                    <input value={this.state.videoID} id="video-id-input" name="videoID" type="hidden" />
                  </div>}
                  <div className="form-group">
                    <label htmlFor="title-input">Title</label>
                    <input onChange={this.handleInput} value={this.displayValue("title")}  className="form-control input-lg" onBlur={this.search} id="title-input" name="title" placeholder="Title"/>
                  </div>
                  <div className="form-group">
                    <label htmlFor="artist-input">Artist</label>
                    <input onChange={this.handleInput} value={this.displayValue("artist")}  className="form-control input-lg" onBlur={this.search} id="artist-input" name="artist" placeholder="Artist" />
                  </div>
                  <div className="form-group">
                    <input type={(this.props.newSong&&this.state.isAudio)? null : "hidden"} onChange={this.handleInput} value={this.state.img}  className="form-control input-lg" id="art-url-input" name="img" placeholder="Artwork URL" />
                  </div>
                  {this.props.newSong || <button type="button" onClick={this.props.onRemove}>Remove this Song</button>}
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
