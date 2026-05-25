declare namespace NaiveUI {
  /**
   * 主题颜色类型
   * 用于 Tag、Button、Badge 等组件的 type 属性
   */
  type ThemeColor = 'default' | 'error' | 'primary' | 'info' | 'success' | 'warning';

  /**
   * 对齐方式
   */
  type Align = 'stretch' | 'baseline' | 'start' | 'end' | 'center' | 'flex-end' | 'flex-start';

  /**
   * 表格列定义
   */
  type TableColumn<T> = 
    | import('naive-ui').DataTableBaseColumn<T> 
    | import('naive-ui').DataTableSelectionColumn<T> 
    | import('naive-ui').DataTableExpandColumn<T>;

  /**
   * 表格操作类型
   */
  type TableOperateType = 'add' | 'edit';

  /**
   * 代码编辑器语言
   */
  type CodeMirrorLang = 'js' | 'json';
}
