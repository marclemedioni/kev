import shuffle from 'shuffle-array';

// ****************************************************************
// ProxyList
// ****************************************************************
export class ProxyList {
  proxyIndex: number;
  proxies: Proxy[];

  constructor() {
    this.proxyIndex = -1;
    this.proxies = [];
  }

  push(proxy: Proxy) {
    this.proxies.push(proxy);
  }

  getProxy() {
    this.proxyIndex++;
    const p = this.proxies[this.proxyIndex];

    if (this.proxyIndex === this.proxies.length - 1) {
      this.proxyIndex = -1;
    }

    return p;
  }

  pick() {
    const proxy = shuffle.pick(this.proxies);
    return proxy;
  }

  getProxies() {
    return this.proxies;
  }

  setProxies(proxies: Proxy[]) {
    this.proxies = proxies;
  }

  getNumberOfProxies() {
    return this.proxies.length;
  }
}

// ****************************************************************
// Proxy
// ****************************************************************
export class Proxy {
  valid: boolean;
  host?: string;
  port?: string;
  userName?: string;
  password?: string;

  constructor() {
    this.valid = false;
  }

  fromArray(proxyInfo: [string, string?, string?, string?]) {
    [this.host, this.port, this.userName, this.password] = proxyInfo;

    return this;
  }

  fromJson(proxyInfo: {
    host: string;
    port: string;
    userName: string;
    password: string;
  }) {
    this.host = proxyInfo.host;
    this.port = proxyInfo.port;
    this.userName = proxyInfo.userName;
    this.password = proxyInfo.password;

    return this;
  }

  getUrl() {
    if (this.userName && this.password) {
      return `${this.userName}:${this.password}@${this.host}:${this.port}`;
    }

    return `${this.host}:${this.port}`;
  }

  getConnectionParams() {
    const info: {
      protocol?: string;
      host?: string;
      port?: string;
      auth?: {
        username: string | null;
        password: string | null;
      };
    } = {
      protocol: 'http',
      host: this.host,
      port: this.port,
    };

    if (this.userName && this.password) {
      info.auth = {
        username: 'username',
        password: 'password',
      };
    }
    return info;
  }

  toString() {
    return `${this.host}:${this.port} - valid : ${this.valid}`;
  }
}

// ****************************************************************
// CheckConfig
// ****************************************************************
export class CheckConfig {
  maxProxies: number;
  googleAdress: string;
  proxyRequestTimeout: number;

  constructor() {
    // max number of proxies to analyse & check in //
    this.maxProxies = 30;
    this.googleAdress = 'https://www.google.com/search?q=test';
    this.proxyRequestTimeout = 10000;
  }

  setProxyRequestTimeout(value: number) {
    this.proxyRequestTimeout = value;

    return this;
  }

  setGoogleAdress(value: string) {
    this.googleAdress = value;

    return this;
  }

  setMaxProxies(value: number) {
    this.maxProxies = value;

    return this;
  }
}

// ****************************************************************
// FileConfig
// ****************************************************************
export class FileConfig {
  proxyFile = './proxies.txt';
  hasToCheckProxies = true;
  removeInvalidProxies = true;
  check = new CheckConfig();
  persist = false;

  setProxyFile(file: string) {
    this.proxyFile = file;

    return this;
  }

  setCheckProxies(value: boolean) {
    this.hasToCheckProxies = value;

    return this;
  }

  setRemoveInvalidProxies(value: boolean) {
    this.removeInvalidProxies = value;

    return this;
  }
}
