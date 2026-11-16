export type Profile = {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
};

export type User = {
  email: string;
  username: string;
  bio: string | null;
  image: string | null;
  token?: string;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: Profile;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: Profile;
};
