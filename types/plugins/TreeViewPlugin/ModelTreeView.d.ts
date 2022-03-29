import { MetaModel } from "../../viewer/metadata";

/**
 * Represents a model tree view within a {@link TreeViewPlugin}.
 */
export declare class ModelTreeView {
  /**
   * Contains messages for any errors found in the MetaModel for this ModelTreeView.
   * @type {String[]}
   */
  errors: string[];

  /**
   * True if errors were found in the MetaModel for this ModelTreeView.
   * @type {boolean}
   */
  valid: boolean;

  /**
   * The MetaModel corresponding to this ModelTreeView.
   * @type {MetaModel}
   */
  metaModel: MetaModel;
}
