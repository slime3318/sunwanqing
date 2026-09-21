import { Component } from 'react';

/**
 * 全局错误边界：任何渲染期异常都会显示可读的报错信息，
 * 而不是让页面变成一片空白（白屏）而无法定位问题。
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] 渲染异常:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="page">
        <div className="empty-state">
          <h1 className="empty-state__title">页面渲染出错</h1>
          <p className="empty-state__desc">
            页面在渲染时抛出了异常。常见原因是后端 API 地址未配置或返回了非预期数据。
          </p>
          <pre className="crash-detail">{String(error?.message || error)}</pre>
          <div className="row-actions">
            <button type="button" className="btn btn--primary" onClick={this.handleReload}>
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }
}
