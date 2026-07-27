interface IStorybookNavigation {
  pathname: string;
  query?: Record<string, string>;
}

export function createStorybookNavigation({ pathname, query = {} }: IStorybookNavigation) {
  return {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname,
        query,
      },
    },
  };
}
