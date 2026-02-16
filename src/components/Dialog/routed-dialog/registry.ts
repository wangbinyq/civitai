import type { ImageDetailDialog } from './image-detail.dialog';
import type { CollectionEditDialog } from './collection-edit.dialog';
import type { HiddenCommentsDialog } from './hidden-comments.dialog';
import type { ResourceReviewDialog } from './resource-review.dialog';
import type { FilesEditDialog } from './files-edit.dialog';
import type { CommentEditDialog } from './comment-edit.dialog';
import type { CommentThreadDialog } from './comment-thread.dialog';
import type { SupportDialog } from './support.dialog';
import type { GeneratedImageDialog } from './generated-image.dialog';
import './image-detail.dialog';
import './collection-edit.dialog';
import './hidden-comments.dialog';
import './resource-review.dialog';
import './files-edit.dialog';
import './comment-edit.dialog';
import './comment-thread.dialog';
import './support.dialog';
import './generated-image.dialog';
import { routedDialogDictionary } from './utils';
import type { ComponentProps } from 'react';

type Dialogs = ImageDetailDialog &
  CollectionEditDialog &
  HiddenCommentsDialog &
  ResourceReviewDialog &
  FilesEditDialog &
  CommentEditDialog &
  CommentThreadDialog &
  SupportDialog &
  GeneratedImageDialog;

export const dialogs = routedDialogDictionary.getItems<Dialogs>();
export type DialogKey = keyof typeof dialogs;
export type DialogState<T extends DialogKey> = ComponentProps<(typeof dialogs)[T]['component']>;
