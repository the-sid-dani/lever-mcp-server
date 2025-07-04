// Lever API Types
export interface LeverOpportunity {
  id: string;
  name: string;
  headline?: string;
  emails?: string[];
  location?: string | { name: string };
  stage?: string | { text: string; id?: string };
  posting?: { text: string; id?: string };
  tags?: string[];
  organizations?: string[];
  createdAt?: number;
  updatedAt?: number;
  resume?: string;
  resumeId?: string;
  files?: any[];
  applications?: any[];
  origin?: string;
  sources?: string[];
  archived?: boolean | any;
  owner?: { name?: string; id?: string } | any;
  links?: string[];
  phones?: { type?: string; value?: string }[] | string[];
}

export interface LeverPosting {
  id: string;
  text: string;
  state: string;
  location?: { name: string };
  team?: { text: string };
  urls?: { show?: string };
}

export interface LeverApiResponse<T> {
  data: T[];
  hasNext?: boolean;
  next?: string;
}

export interface SearchCriteria {
  companies?: string;
  skills?: string;
  locations?: string;
  stage?: string;
  tags?: string;
  posting_id?: string;
  limit?: number;
}