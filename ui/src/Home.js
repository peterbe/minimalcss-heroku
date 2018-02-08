import React from 'react';
import './Home.css';

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      result: null,
      fetching: false
    };
  }

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
    return this.fetchResult(url).then(() => {
      // Update the URL?
    });
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
                    <button type="submit" className="button is-info">
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
  render() {
    const { result } = this.props;
    if (result === null) {
      return null;
    }
    if (result.error) {
      return (
        <div className="box">
          <p>Error...</p>
          <pre>{result.error}</pre>
        </div>
      );
    }
    console.log('RESULT', result);
    const stylesheetContents = result.result.stylesheetContents;
    return (
      <div className="box">
        <p>Results here...</p>
        <div className="css">{result.result.finalCss}</div>
        <p>
          <small>Took {formatTime(result.result._took)}</small>
        </p>
        <h4>Stylesheets</h4>
        <ul>
          {Object.keys(stylesheetContents).map(url => {
            return (
              <li key={url}>
                <a href={url}>{url}</a>{' '}
                <b>{formatSize(stylesheetContents[url].length)}</b>
              </li>
            );
          })}
        </ul>
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
