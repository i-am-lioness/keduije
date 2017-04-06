
var update = React.addons.update;

class Edits extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      edits: [],
      adds: [],
      listings: [],
      songs:{} //rename to "meta"
    };

    this.eachEdit = this.eachEdit.bind(this);
    this.eachDiff = this.eachDiff.bind(this);
    this.setEdits = this.setEdits.bind(this);
    this.setAdds = this.setAdds.bind(this);
    this.saveSongInfo = this.saveSongInfo.bind(this);
    this.processEdit = this.processEdit.bind(this);
    this.setListings = this.setListings.bind(this);
  }

  componentWillMount(){
    KeduIje.getRevisions(this.setEdits);
    KeduIje.myLines(this.setAdds);
    KeduIje.listMedia(this.setListings);
  }

  setEdits(edits){
    edits.forEach(this.processEdit.bind(this,"edit"));
    console.log(edits);

    this.setState({edits: edits});
  }

  saveSongInfo(songInfo){
    var updateObj = {};
    updateObj[songInfo._id]={$set: songInfo};
    this.setState({songs: update(this.state.songs, updateObj)});
  }

  setAdds(adds){
    adds.forEach(this.processEdit.bind(this,"add"));

    this.setState({adds: adds});
  }

  setListings(listings){
    listings.forEach(this.processEdit.bind(this,"listing"));

    this.setState({listings: listings});
  }

  processEdit(type, el){
    el.type=type;

    var timestamp = el._id.toString().substring(0,8);
    var date = new Date( parseInt( timestamp, 16 ) * 1000 );
    el.date=date;

    var mediaID = el.mediaID || el._id;

    if(!this.state.songs[mediaID])
      KeduIje.getMediaInfo(mediaID, this.saveSongInfo);
  }

  eachDiff(diff,i){

    var className = null;
    if(diff.added)
      className="added";
    else if(diff.removed)
      className="removed"

    return <span className={className} key={i}>{diff.value}</span>;
  }

  changedInfo(name, edit){
    return <p>Renamed {name}: {edit.original[name]} => {edit.newValues[name]}</p>;
  }

  eachEdit(edit, idx){

    var song = this.state.songs[edit.mediaID||edit._id];
    var songUrl=null;
    var songTitle = null;

    if(song) {
      songUrl="/music/"+song.slug;
      songTitle = <a className="song-title" href={songUrl}>{song.title}</a>;
    }

    var output= null;
    if(edit.type=="edit"){
      if(!edit.newValues) return null;
      if(edit.newValues.text){ //if a line edit
        var diff = JsDiff.diffChars(edit.original.text, edit.newValues.text);
        var changes = diff.map(this.eachDiff);
        output = <p>Edited: <strong>{changes}</strong></p>;
      }else{ //if an info edit

        var textOutput, artistOutput, imgOutput = null;
        if(edit.newValues.title){
          textOutput = this.changedInfo("title", edit);
        }

        if(edit.newValues.artist){
          artistOutput = this.changedInfo("artist", edit);
        }

        if(edit.newValues.img){
          imgOutput = <p>changed art work</p>;
        }

        output = <span>{textOutput} {artistOutput} {imgOutput}</span>;
      }

    }else if(edit.type=="add"){
      var startTime = KeduIje.convertToTime(edit.startTime);
      var endTime = KeduIje.convertToTime(edit.endTime);
      output = <p>Added:
        <strong>{edit.text}</strong>
        <a href={songUrl+"#"+edit.startTime}>({startTime})</a>
      </p>;
    }else if(edit.type=="listing"){
      output=<p> Listed this song</p>;
    }


    return <div
        className="panel panel-default"
        key={edit._id}
      >
        <div className="panel-heading">
          {songTitle}
          <span className="label label-default">{edit.date.toLocaleString()}</span>
        </div>
        <div className="panel-body">
          {output}
        </div>
      </div>;

  }

  render () {
    var activities = this.state.adds.concat(this.state.edits).concat(this.state.listings);
    //console.log(this.state.edits);
    activities.sort((a,b)=>{return (b.date-a.date);});
    var activityDisplay = activities.map(this.eachEdit);

    return <div className="">
        {activityDisplay}
      </div>;

  }
}
