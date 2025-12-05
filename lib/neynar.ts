export interface BestFriend {
  fid: number;
  mutual_affinity_score: number;
  username: string;
}

export interface User {
  object: string;
  fid: number;
  custody_address: string;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
    primary?: {
      eth_address?: string;
      sol_address?: string;
    };
  };
}
