
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

class Search extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
      results: [],
      mobile: false
    };

    this.toggleExpand = this.toggleExpand.bind(this);
    this.query = this.query.bind(this);
    this.listResults = this.listResults.bind(this);
    this.eachResult = this.eachResult.bind(this);
    this.showMobileSearch = this.showMobileSearch.bind(this);
    this.desktop = this.desktop.bind(this);
    this.mobile = this.mobile.bind(this);
  }

  toggleExpand(val){
    if(!val) //delay needed because it seems onBlur fires before onClick is processed for link
     setTimeout(this.setState.bind(this, {active:false}), 500);
    else
      this.setState({active: val});
  }

  query(e){
    var q=e.target.value;

    if (q)
      KeduIje.search(q, this.listResults);
  }

  listResults(songs){
    console.log(songs);
    this.setState({
      results: songs
    });
  }

  eachResult(result){
    var url = "/music/" + result.slug;
    var label = (result.artist)? result.artist + " - "+result.title : result.title;
    return <div key={result.slug} className="search-result">
      <a href={url} >{label}</a>
    </div>;
  }

  showMobileSearch(val){
    this.setState({
      mobile: val
    });

  }

  mobile(resultsDiv){
    return <div className="mobile-search">
      <span className= "glyphicon glyphicon-remove" aria-hidden="true" onClick={this.showMobileSearch.bind(this,false)}></span>;
      <input
        className={"form-control"}
        type="text"
        placeholder="  Search"
        onChange={this.query}
      />
      {resultsDiv}
    </div>
  }

  desktop(resultsDiv){
    return <span>
      <input
        className={"form-control"}
        type="text"
        placeholder="  Search"
        onFocus={this.toggleExpand.bind(this, true)}
        onBlur={this.toggleExpand.bind(this, false)}
        style={{width: (this.state.active)? "500px" : null}}
        onChange={this.query}
      />
      <span className= "glyphicon glyphicon-search" aria-hidden="true" onClick={this.showMobileSearch.bind(this,true)}></span>
      {resultsDiv}
    </span>;
  }

  render () {
    var results = this.state.results.map(this.eachResult);
    var resultsDiv =  <div className="search-results">{results}</div>;
    if(this.state.mobile)
      return this.mobile(resultsDiv);
    else
      return this.desktop(resultsDiv)

  }
}
