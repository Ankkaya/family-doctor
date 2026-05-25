/**
 * 切换 HTML 元素的类名
 * @param className 类名
 */
export function toggleHtmlClass(className: string) {
  function add() {
    document.documentElement.classList.add(className);
  }

  function remove() {
    document.documentElement.classList.remove(className);
  }

  return { add, remove };
}
