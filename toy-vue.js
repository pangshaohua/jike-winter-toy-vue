export class ToyVue {
  constructor(config) {
    this.template = document.querySelector(config.el)
    this.data = reactive(config.data)

    
    for (let name in config.methods) {
      this[name] = () => {
        // 保证方法中的this.message中的this指向 data,但是当方法中再执行方法时，this的指向就会错误
        config.methods[name].apply(this.data)
      }
      // 将方法都挂到data上解决this指向问题
      this.data[name] = config.methods[name]
    }

    this.traversal(this.template)
  }
  // 渲染数据
  traversal(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim().match(/^{{([\s\S]+)}}$/)) {
        let name = RegExp.$1.trim()
        effect(() => node.textContent = this.data[name])
      }
    }
 
    if (node.nodeType === Node.ELEMENT_NODE) {
      let attributes = node.attributes
      for(let attribute of attributes) {
        if (attribute.name === 'v-model') {
          let name = attribute.value
          effect(() => node.value = this.data[name]);
          node.addEventListener('input',event => this.data[name] = node.value);
        }
        if (attribute.name.match(/^v\-bind:([\s\S]+)/)) {
          let attrname = RegExp.$1
          let name = attribute.value
          effect(() => node.setAttribute(attrname,this.data[name]));
        }
        if (attribute.name.match(/^v\-on:([\s\S]+)/)) {
          let eventname = RegExp.$1
          let fnname = attribute.value
          node.addEventListener(eventname,this[fnname])
        }
      }
    }

    if (node.childNodes && node.childNodes.length) {
      for(let child of node.childNodes) {
        this.traversal(child)
      }
    }
  }
}
let effects = new Map();

let currentEffect = null
function effect(fn) {
  currentEffect = fn;
  fn();
  currentEffect = null
}

// 创建响应式数据
function reactive(object) {
  let observed = new Proxy(object,{
    get(object,property) {
      if (currentEffect) {
        if (!effects.has(object)) {
          effects.set(object,new Map);
        }
        if (!effects.get(object).get(property)) {
          effects.get(object).set(property,new Array);
        }
        effects.get(object).get(property).push(currentEffect)
      }
      return object[property];
    },
    set(object,property,value) {
      object[property] = value;
      if (effects.has(object) && effects.get(object).has(property)) {
        for(let effect of effects.get(object).get(property)) {
          effect();
        }
      }
      return value;
    }
  })
  return observed;
}
