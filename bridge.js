// 使用方法
// import { callhandler } from "@/tools/bridge";
// let res = await callhandler("getUser");
// console.log("获取数据", res);

/**
 * 和 webview交互 ,这段代码是固定的，必须要放到js中. 官方文档 https://github.com/marcuswestin/WebViewJavascriptBridge
 * @param {function} callback
 */
function setupWebViewJavascriptBridge (callback) {
  //Android直接判断即可 , 在ios上不存在 window.WebViewJavascriptBridge 变量
  if (window.WebViewJavascriptBridge) {
    return callback(window.WebViewJavascriptBridge);
  }
  //后续代码是为了ios适用, 所以会导致在普通浏览器上 window.WVJBCallbacks 非空, 非webview中(没有bridge的情况下)尝试调用bridge方法会导致该数组内容激增
  if (window.WVJBCallbacks) {
    return window.WVJBCallbacks.push(callback);
  }
  window.WVJBCallbacks = [callback];
  const WVJBIframe = document.createElement("iframe");
  WVJBIframe.style.display = "none";
  WVJBIframe.src = "wvjbscheme://__BRIDGE_LOADED__";
  setTimeout(() => {
    document.documentElement.appendChild(WVJBIframe);
    setTimeout(() => {
      document.documentElement.removeChild(WVJBIframe);
    }, 0);
  }, 0);
}

//是否在线上三门峡APP中, 2.0.0以及以上版本100%可靠. 低于2.0.0的版本在ios上100%可靠.
// export const isInSmxApp = !!navigator.userAgent.match(/SmxOnline/i);

//当前是否在微信里面
// export const isInWeiXin = !!navigator.userAgent.match(/MicroMessenger/i);

//当前是否是ios系统
// export const isInIos = !!navigator.userAgent.match(/ipad|iphone|ipod/i);

/**
 * bridge是否准备好了? 如果准备好了就直接返回promise<resolved>
 * @param wait 当 wait == true 时, 如果bridge没有准备好,就反复尝试检测一段时间,等到准备好之后再 resolve; 如果wait==false并且bridge没准备好,则直接reject
 * @returns {Promise}
 */
export const checkBridgeReady = (wait = true) => {
  if (window.isBridgeReady) {
    return Promise.resolve(true);
  } else if (window.isBridgeReady === false) {
    return Promise.reject(false);
  } else if (isInWeiXin) {
    // 如果在微信,直接视为 false
    window.isBridgeReady = false;
    return Promise.reject(false);
  } else if (wait === false) {
    return Promise.reject(false);
  } else {
    return new Promise((resolve, reject) => {
      let count = 0;
      const timer = setInterval(() => {
        count++;
        if (count > 100) {
          // 大概等 5 秒
          clearInterval(timer);
          //注入标志位
          window.isBridgeReady = false;
          reject(new Error(`放弃循环检测!(尝试重复${count}次后,仍未检测到bridge准备好)`));
        }
        if (window.isBridgeReady) {
          clearInterval(timer);
          resolve(true);
        }
      }, 50);
    });
  }
};

/**
 * 调用 app 方法
 * @param {String} name
 * @param {String | Object} data
 */
export async function callhandler (name, data = undefined) {
  return new Promise((resolve, reject) => {
    setupWebViewJavascriptBridge(bridge => {
      if (!bridge) resolve("");
      bridge.callHandler(name, data, res => {
        if (typeof res === "string" && res.length > 0) {
          //{"code":200,"data":略,"msg":"成功"}
          try {
            let obj = JSON.parse(res);
            if (obj.code === 200) {
              resolve(obj.data);
            } else {
              reject(obj);
            }
          } catch (e) {
            reject(e);
          }
        } else {
          reject(res || "");
        }
      });
    });
  });
}

/**
 * 注册方法，提供给app调用
 * 调用后app为js 提供数据
 * @param {String} name
 * @param {*} callback
 */
export const registerhandler = (name, callback) => {
  setupWebViewJavascriptBridge(bridge => {
    bridge.registerHandler(name, (data, responseCallback) => {
      callback(data, responseCallback);
    });
  });
};

/**
 * 图片上传
 */
export async function callCameraOrPhoto (imgLength = 3) {
  return callhandler("callCameraOrPhoto", imgLength);
}

/**
 * 获取token
 */
export async function getToken () {
  return callhandler("getUser");
}
/**
 * 线上三门峡返回功能
 */
export async function goBack () {
  return callhandler("goBack");
}

/**
 * 关闭webView，回到首页
 */
export async function closeWeb () {
  return callhandler("closeWeb");
}

/**
 * 隐藏显示导航条
 * @param string flag show显示 , hide隐藏
 */
export async function topViewStatus (flag) {
  return callhandler("topViewStatus", flag);
}
