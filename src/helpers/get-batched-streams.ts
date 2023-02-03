import * as _ from 'lodash';
import { IContentSearchRequest } from "@esri/hub-search";
import { getBatchPageKeys } from './get-batch-page-keys';
import { getBatchingParams } from './get-batching-params';
import { PagingStream } from '../paging-stream';
import { getPagingStream } from './get-paging-stream';
import { IModel } from '@esri/hub-common';

export type BatchSearch = {
  request: IContentSearchRequest,
  siteUrl: string,
  siteModel: IModel,
  limit?: number | undefined
}
export const getBatchedStreams = async (batchSearchRequest: BatchSearch): Promise<PagingStream[]> => {
  const {
    request,
    siteUrl,
    siteModel,
    limit
  }: BatchSearch = batchSearchRequest;

  const { numBatches, pagesPerBatch, pageSize } = await getBatchingParams(request, limit);
  const pageKeys: string[] = await getBatchPageKeys(
    numBatches,
    pagesPerBatch,
    pageSize,
    limit
  );
  const requests: IContentSearchRequest[] = pageKeys.map((key: string) => {
    const clone = _.cloneDeep(request);
    _.set(clone, 'options.page', key);
    return clone;
  });
  return requests.map((batchRequest: IContentSearchRequest, i: number, requests: IContentSearchRequest[]) => {
    return getPagingStream(
      batchRequest, 
      {
        siteUrl, 
        siteModel,
        portalUrl: batchRequest.options.portal
      }, 
      getPagesPerBatch(limit, i, requests, pagesPerBatch)
      );
  });
};

/*  
  If limit is provided, pagesPerBatch is set to 1 and disregard the previously 
  calculated pagesPerBatch for the last content search request. It is required 
  to do so as default paging strategy is not implemented for the last batch.
*/
const getPagesPerBatch = (limit: number, requestIndex: number, requests: IContentSearchRequest[], pagesPerBatch: number) => {
  return limit ? (requestIndex + 1 === requests.length ? 1 : pagesPerBatch) : pagesPerBatch;
};