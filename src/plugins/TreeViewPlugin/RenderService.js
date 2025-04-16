import { addContextMenuListener } from "../lib/html/MenuEvent.js";
/**
 * @desc A {@link TreeViewPlugin} render class.
 * 
 */
export class RenderService {

  /**
  * @constructor
  *
  * @param {HTMLElement} treeViewContainer Container element for the tree which uses this render service.
  */
  constructor(treeViewContainer) {
    this._treeViewContainer = treeViewContainer;
  }

  /*
  * Creates the root node of the tree.
  * @return {HTMLElement} The root node of the tree.
  */
  createRootNode() {
    return document.createElement('ul')
  }

  /*
  * Creates node of the tree.
  * @param {Object} node The node to create.

  * @return {HTMLElement} The html element for the node.
  */
  createNodeElement(node, expandHandler, checkHandler, contextmenuHandler, titleClickHandler) {
    const nodeElement = document.createElement('li');
    nodeElement.id = node.nodeId;

    if (node.xrayed) {
        nodeElement.classList.add('xrayed-node');
    }
    
    if (node.children.length > 0) {
        const switchElement = document.createElement('a');
        switchElement.href = '#';
        switchElement.id = `switch-${node.nodeId}`;
        switchElement.textContent = '+';
        switchElement.classList.add('plus');
        if (expandHandler) switchElement.addEventListener('click', expandHandler);
        nodeElement.appendChild(switchElement);
    }
    
    const checkbox = document.createElement('input');
    checkbox.id = `checkbox-${node.nodeId}`;
    checkbox.type = "checkbox";
    checkbox.checked = node.checked;
    checkbox.style["pointer-events"] = "all";
    if (checkHandler) checkbox.addEventListener("change", checkHandler);
    nodeElement.appendChild(checkbox);
    
    const span = document.createElement('span');
    span.textContent = node.title;
    nodeElement.appendChild(span);

    if (contextmenuHandler) {
      addContextMenuListener(span, contextmenuHandler)
    }

    if (titleClickHandler) {
      span.onclick = titleClickHandler;
    }

    return nodeElement;
  }

  createDisabledNodeElement(rootName) {
    const li = document.createElement('li');

    const switchElement = document.createElement('a');
    switchElement.href = '#';
    switchElement.textContent = '!';
    switchElement.classList.add('warn');
    switchElement.classList.add('warning');
    li.appendChild(switchElement);
    
    const span = document.createElement('span');
    span.textContent = rootName;
    li.appendChild(span);

    return li;
  }

  addChildren(element, nodes) {
    const ul = document.createElement('ul');
    nodes.forEach((nodeElement) => {
      ul.appendChild(nodeElement);
    });

    element.parentElement.appendChild(ul);
  }

  expand(element, expandHandler, collapseHandler) {
    element.classList.remove('plus');
    element.classList.add('minus');
    element.textContent = '-';
    element.removeEventListener('click', expandHandler);
    element.addEventListener('click', collapseHandler);
  }

  collapse(element, expandHandler, collapseHandler) {
    if (!element) {
      return;
    }
    const parent = element.parentElement;
    if (!parent) {
        return;
    }
    const ul = parent.querySelector('ul');
    if (!ul) {
        return;
    }
    parent.removeChild(ul);
    element.classList.remove('minus');
    element.classList.add('plus');
    element.textContent = '+';
    element.removeEventListener('click', collapseHandler);
    element.addEventListener('click', expandHandler);
  }

  isExpanded(element) {
    const parentElement = element.parentElement;
    return parentElement.getElementsByTagName('li')[0] !== undefined;
  }

  getId(element) {
    const parentElement = element.parentElement;
    return parentElement.id;
  }

  getIdFromCheckbox(element) {
    return element.id.replace('checkbox-', '');
  }

  getSwitchElement(nodeId) {
    return this._treeViewContainer.querySelector(`[id="switch-${nodeId}"]`);
  }

  isChecked(element) {
    return element.checked;
  }

  setCheckbox(nodeId, checked, indeterminate = false) {
    const checkbox = this._treeViewContainer.querySelector(`[id="checkbox-${nodeId}"]`);
    if (checkbox) {
      if (checked !== checkbox.checked) {
        checkbox.checked = checked;
      }
      if (indeterminate !== checkbox.indeterminate) {
        checkbox.indeterminate = indeterminate;
        if (indeterminate) {
          checkbox.checked = false;
        }
      }
    }
  }

  setXRayed(nodeId, xrayed) {
    const treeNode = this._treeViewContainer.querySelector(`[id="${nodeId}"]`);
    if (treeNode) {
      if (xrayed) {
        treeNode.classList.add('xrayed-node');
      } else {
        treeNode.classList.remove('xrayed-node');
      }
    }
  }

  setHighlighted(nodeId, highlighted) { 
    const treeNode = this._treeViewContainer.querySelector(`[id="${nodeId}"]`);
    if (treeNode) {
      if (highlighted) {
        treeNode.scrollIntoView({block: "center"});
        treeNode.classList.add('highlighted-node');
      } else {
        treeNode.classList.remove('highlighted-node');
      }
    }
  }
}
