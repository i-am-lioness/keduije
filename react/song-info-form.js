
      class SongInfoForm extends React.Component {
        constructor(props) {
          super(props);
          this.state = {
            selectedImage: null,
            images: new Set()
          }
          this.handleClick = this.handleClick.bind(this);
          this.eachImage = this.eachImage.bind(this);
          this.search = this.search.bind(this);
          this.queryYoutube = this.queryYoutube.bind(this);
          this.displayVideoInfo = this.displayVideoInfo.bind(this);
        }

        handleClick(src){
          this.artInput.value = src;
          this.setState({selectedImage: src});
        }

        eachImage(src){
          var selectedClass = (this.state.selectedImage == src)? " selected" : "";
          return <a href="#" key={src} className={"thumbnail " + selectedClass} onClick={this.handleClick.bind(this, src)}>
                  <img src={src} alt="..." />
              </a>;
        }

        search(e){
          $.get("https://api.spotify.com/v1/search", {type: "track", "q": e.currentTarget.value},function(data){
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
          this.titleInput.value = video.title;
          $("#video-id-input").val(res.id); //todo: reimplement

          var tns=video.thumbnails;

          var images = Array.from(this.state.images);
          images.push(tns.medium.url);
          this.setState({
            images: new Set(images)
          })
        }

        render () {

          return <div>

            <form id="new-song-form" method="post">
              <div className="form-group">
                <label htmlFor="video-url-input">Video URL</label>
                <input onBlur={this.queryYoutube} className="form-control input-lg" id="video-url-input" name="url" placeholder="Link to youtube video" />
                <input id="video-id-input" name="videoID" type="hidden" />
              </div>
              <div className="form-group">
                <label htmlFor="title-input">Title</label>
                <input className="form-control input-lg" ref={(el)=>{this.titleInput = el}} onBlur={this.search} id="title-input" name="title" placeholder="Title"/>
              </div>
              <div className="form-group">
                <label htmlFor="artist-input">Artist</label>
                <input className="form-control input-lg" onBlur={this.search} id="artist-input" name="artist" placeholder="Artist" />
              </div>
              <div className="form-group">
                <label htmlFor="art-url-input">Artwork URL</label>
                <input className="form-control input-lg" ref={(el)=>{this.artInput = el}} id="art-url-input" name="img" placeholder="Artwork URL" />
              </div>
              <button className="btn btn-default" type="submit">Add</button>
            </form>

            <div className="images-container">{Array.from(this.state.images).map(this.eachImage)}</div>
          </div>;

        }
      }
