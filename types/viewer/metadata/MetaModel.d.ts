import { MetaScene } from './MetaScene';
import { PropertySet } from './PropertySet';
import { MetaObject } from './MetaObject';

/**
 * Metadata corresponding to an {@link Entity} that represents a model.
 */
export declare class MetaModel {
  /**
   * Globally-unique ID.
   *
   * MetaModels are registered by ID in {@link MetaScene#metaModels}.
   *
   * When this MetaModel corresponds to an {@link Entity} then this ID will match the {@link Entity#id}.
   *
   */
  id: string | number;

  /**
   * The project ID
   */
  projectId: string | number;

  /**
   * The revision ID, if available.
   */
  revisionId?: string | number;

  /**
   * The model author, if available.
   */
  author?: string;

  /**
   * The date the model was created, if available.
   */
  createdAt?: string;

  /**
   * The application that created the model, if available.
   */
  creatingApplication?: string;

  /**
   * The model schema version, if available.
   */
  schema?: string;

  /**
   * Metadata on the {@link Scene}.
   */
  metaScene?: MetaScene;

  /**
   * The {@link PropertySet}s in this MetaModel.
   */
  propertySets: {
    String: PropertySet;
  };

  /**
   * The root {@link MetaObject} in this MetaModel's composition structure hierarchy.
   */
  rootMetaObject: MetaObject;
}
