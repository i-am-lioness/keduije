
var update = React.addons.update;

class Edits extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      edits: [],
      adds: [],
      songs:{}
    };

    this.eachEdit = this.eachEdit.bind(this);
    this.eachDiff = this.eachDiff.bind(this);
    this.setEdits = this.setEdits.bind(this);
    this.setAdds = this.setAdds.bind(this);
    this.saveSongInfo = this.saveSongInfo.bind(this);
    this.extractDate = this.extractDate.bind(this);
  }

  componentWillMount(){
    KeduIje.getRevisions(this.setEdits);
    KeduIje.myLines(this.setAdds);
  }

  setEdits(edits){
    edits.forEach((el)=>{ el.type="edit"});
    edits.forEach(this.extractDate);

    this.setState({edits: edits});
  }

  saveSongInfo(songInfo){
    var updateObj = {};
    updateObj[songInfo._id]={$set: songInfo};
    this.setState({songs: update(this.state.songs, updateObj)});
  }

  setAdds(adds){
    console.log(adds);
    adds.forEach((el)=>{ el.type="add"});
    adds.forEach(this.extractDate);

    this.setState({adds: adds});
  }

  extractDate(el){
    var timestamp = el._id.toString().substring(0,8);
    var date = new Date( parseInt( timestamp, 16 ) * 1000 );
    el.date=date;

    console.log("songs",this.state.songs);

    if(!this.state.songs[el.mediaID])
      KeduIje.getMediaInfo(el.mediaID, this.saveSongInfo);
  }

  eachDiff(diff,i){

    var className = null;
    if(diff.added)
      className="added";
    else if(diff.removed)
      className="removed"

    return <span className={className} key={i}>{diff.value}</span>;
  }

  eachEdit(edit, idx){

    var output= null
    if(edit.type=="edit" && edit.newValues.text){
      var diff = JsDiff.diffChars(edit.original.text, edit.newValues.text);
      var changes = diff.map(this.eachDiff);
      output = <p>Edited: <strong>{changes}</strong></p>;
    }else if(edit.type=="add"){
      output = <p>Added: <strong>{edit.text}</strong></p>
    }

    var song = this.state.songs[edit.mediaID];
    var songTitle = song? <a href={"/music/"+song.slug}>{song.title}</a> : null;

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
    var activities = this.state.adds.concat(this.state.edits);
    activities.sort((a,b)=>{return (a.date<b.date);});
    var activityDisplay = activities.map(this.eachEdit);

    return <div className="">
        {activityDisplay}
      </div>;

  }
}
