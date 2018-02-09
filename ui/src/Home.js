import React from 'react';
import './Home.css';

function getQueryVariable(query, variable) {
  var vars = query.substring(1, query.length).split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) === variable) {
      return decodeURIComponent(pair[1]);
    }
  }
}

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      result: null,
      fetching: false
    };
  }

  componentDidMount() {
    if (this.props.location.search) {
      const url = getQueryVariable(this.props.location.search, 'url');
      if (url) {
        this.refs.url.value = url;
        this.fetchResult(url);
      }
    }
  }

  // componentWillReceiveProps(nextProps) {
  //   // will be true
  //   const locationChanged = nextProps.location !== this.props.location;
  //   console.log('locationChanged', locationChanged);
  // }

  fetchResult = url => {
    if (!url.trim()) {
      throw new Error('no url');
    }
    this.setState(prevState => ({
      fetching: true,
      result: null
    }));
    return fetch('/api/minimize', {
      method: 'POST',
      body: JSON.stringify({ url }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
        return response.json();
      })
      .then(json => {
        console.log('JSON:', json);
        this.setState({
          result: json,
          fetching: false
        });
      })
      .catch(e => {
        this.setState({
          message: `API call failed: ${e}`,
          fetching: false
        });
      });
  };

  submitForm = event => {
    event.preventDefault();
    const url = this.refs.url.value.trim();
    if (!url) {
      return;
    }
    let newPath = this.props.location.pathname;
    newPath += `?url=${encodeURIComponent(url)}`;
    this.props.history.push(newPath);
    return this.fetchResult(url);
  };

  render() {
    return (
      <div className="hero-body">
        <div className="container has-text-centered">
          <div className="column is-6 is-offset-3">
            <h1 className="title">
              Try <code>minimalcss</code>
            </h1>
            <h2 className="subtitle">
              Enter a URL and we'll give you the minimal CSS needed to load this
              page.
            </h2>
            <div className="box">
              <form method="get" onSubmit={this.submitForm}>
                <div className="field is-grouped">
                  <p className="control is-expanded">
                    <input
                      className="input"
                      type="url"
                      ref="url"
                      defaultValue="https://news.ycombinator.com"
                      placeholder="For example. http://localhost:3000"
                    />
                  </p>
                  <p className="control">
                    <button
                      type="submit"
                      className="button is-info"
                      disabled={this.state.fetching}
                    >
                      Go!
                    </button>
                  </p>
                </div>
              </form>
            </div>

            {this.state.fetching ? <DisplayFetching /> : null}
            <DisplayResult result={this.state.result} />
          </div>
        </div>
      </div>
    );
  }
}

export default Home;

class DisplayResult extends React.PureComponent {
  state = { showPrettier: false };

  toggleShowPrettier = event => {
    this.setState(prevState => ({
      showPrettier: !prevState.showPrettier
    }));
  };

  render() {
    const { result } = this.props;
    if (result === null) {
      return null;
    }
    console.log('RESULT', result);
    if (result.error) {
      return (
        <div className="box">
          <h3>Error...</h3>
          <div className="notification is-danger">
            <pre>{result.error}</pre>
          </div>
        </div>
      );
    }
    const stylesheetContents = result.result.stylesheetContents;
    let previousTotalSize = 0;
    if (Object.keys(stylesheetContents).length) {
      previousTotalSize = Object.keys(stylesheetContents)
        .map(k => {
          return stylesheetContents[k].length;
        })
        .reduce((a, b) => a + b);
    }
    const newTotalSize = result.result.finalCss.length;

    return (
      <div className="box" style={{ textAlign: 'left' }}>
        <h3>Results</h3>
        <p>
          <button
            type="button"
            onClick={this.toggleShowPrettier}
            disabled={!this.state.showPrettier}
          >
            Raw CSS
          </button>
          {' | '}
          <button
            type="button"
            onClick={this.toggleShowPrettier}
            disabled={this.state.showPrettier}
          >
            Pretty CSS
          </button>
        </p>

        {/* XXX this is ugly */}
        <pre className="css">
          {this.state.showPrettier
            ? result.result._prettier
            : result.result.finalCss}
        </pre>

        <p>
          <small>Took {formatTime(result.result._took)}</small>
          <br />
          <small>Size {formatSize(newTotalSize)}</small>
          <br />
          <small>Size before {formatSize(previousTotalSize)}</small>
          <br />
          <small>
            Size reduction {formatSize(previousTotalSize - newTotalSize)}
          </small>
        </p>
        <h3>Stylesheets</h3>
        <table style={{ width: '100%' }}>
          <tbody>
            {Object.keys(stylesheetContents).map(url => {
              return (
                <tr key={url}>
                  <td>
                    <a href={url}>{url}</a>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <b>{formatSize(stylesheetContents[url].length)}</b>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

class DisplayFetching extends React.PureComponent {
  state = { waiting: 0 };
  componentDidMount() {
    this.interval = setInterval(() => {
      if (this.dismounted) return;

      this.setState(prevState => ({
        waiting: prevState.waiting + 1
      }));
    }, 1000);
  }
  componentWillUnmount() {
    this.dismounted = true;
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  render() {
    if (this.state.waiting < 1) {
      return null;
    }
    return (
      <div className="box">
        <p>Fetching...</p>
        <p>Been waiting for {this.state.waiting} seconds</p>
      </div>
    );
  }
}

function formatTime(ms) {
  if (ms > 1000) {
    const s = ms / 1000;
    return `${s.toFixed(2)} seconds`;
  }
  return `${ms.toFixed(2)} milliseconds`;
}

const formatSize = (bytes, decimals = 0) => {
  if (!bytes) return '0 bytes';
  const k = 1024;
  const dm = decimals + 1 || 3;
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
