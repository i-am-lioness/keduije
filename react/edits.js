
var update = React.addons.update;

class Edits extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      listings: [],
      changesets: [],
      songs:{}, //rename to "meta"
      edits: {},
      adds: {}
    };

    this.eachEdit = this.eachEdit.bind(this);
    this.eachDiff = this.eachDiff.bind(this);
    this.setEdits = this.setEdits.bind(this);
    this.setAdds = this.setAdds.bind(this);
    this.saveSongInfo = this.saveSongInfo.bind(this);
    this.processEdit = this.processEdit.bind(this);
    this.setListings = this.setListings.bind(this);
    this.setChangesets = this.setChangesets.bind(this);
    this.eachChangeset = this.eachChangeset.bind(this);
    this.processSession = this.processSession.bind(this);
    this.listEdits = this.listEdits.bind(this);
  }

  componentWillMount(){
    KeduIje.getChangesets(this.setChangesets);
  }

  setChangesets(changesets){
    changesets.forEach(this.processSession.bind(this,"changeset"));
    changesets.sort((a,b)=>{return (b.date-a.date);});

    this.setState({changesets: changesets});
  }

  setEdits(changesetID, edits){
    edits.forEach(this.processEdit.bind(this,"edit"));
    edits.sort((a,b)=>{return (b.date-a.date);});

    var updateObj = {};
    updateObj[changesetID]={$set: edits};
    this.setState({edits: update(this.state.edits, updateObj)});
  }

  saveSongInfo(songInfo){
    var updateObj = {};
    updateObj[songInfo._id]={$set: songInfo};
    this.setState({songs: update(this.state.songs, updateObj)});
  }

  setAdds(changesetID, adds){
    adds.forEach(this.processEdit.bind(this,"add"));
    adds.sort((a,b)=>{return (b.date-a.date);});

    var updateObj = {};
    updateObj[changesetID]={$set: adds};
    this.setState({adds: update(this.state.adds, updateObj)});
  }

  setListings(listings){
    listings.forEach(this.processSession.bind(this,"listing"));

    this.setState({listings: listings});
  }

  processEdit(type, el){
    el.type=type;

    var timestamp = el._id.toString().substring(0,8);
    var date = new Date( parseInt( timestamp, 16 ) * 1000 );
    el.date=date;

  }

  processSession(type, el){
    el.type=type;

    var timestamp = el._id.toString().substring(0,8);
    var date = new Date( parseInt( timestamp, 16 ) * 1000 );
    el.date=date;

    var mediaID = el.mediaID || el._id;

    if(!this.state.songs[mediaID])
      KeduIje.getMediaInfo(mediaID, this.saveSongInfo);

    var changesetID = el._id;
    KeduIje.getRevisions(changesetID, this.setEdits.bind(this, changesetID));
    KeduIje.myLines(changesetID, this.setAdds.bind(this, changesetID));
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

  eachEdit(songUrl, edit, idx){

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
    }


    return <li className="list-group-item" key={edit._id}>
            {output}
          </li>;

  }

  listEdits(changesetID, songUrl){
    var edits = (this.state.adds[changesetID]||[]).concat((this.state.edits[changesetID]||[]));
    edits.sort((a,b)=>{return (b.date-a.date);});

    var editsHTML = edits.map(this.eachEdit.bind(this, songUrl));

    return <ul className="list-group">{editsHTML}</ul>;
  }

  eachChangeset(changeset, idx){

    var song = this.state.songs[changeset.mediaID];
    var songUrl=null;
    var songTitle = null;

    if(song) {
      songUrl="/music/"+song.slug;
      songTitle = <a className="song-title" href={songUrl}>{song.title}</a>;
    }

    var output= null;
    if(changeset.type=="changeset"){
      output = this.listEdits(changeset._id, songUrl);
      
    }else if(changeset.type=="listing"){
      output=<p> Listed this song</p>;
    }


    return <div
        className="panel panel-default"
        key={changeset._id}
      >
        <div className="panel-heading">
          {songTitle}
          <span className="label label-default">{changeset.date.toLocaleString()}</span>
        </div>
        <div className="panel-body">
          {output}
        </div>
      </div>;

  }

  render () {

    var activityDisplay = this.state.changesets.map(this.eachChangeset);

    return <div className="">
        {activityDisplay}
      </div>;

  }
}
