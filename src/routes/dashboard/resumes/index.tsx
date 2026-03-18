import { t } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import {
  GridFourIcon,
  ListIcon,
  ReadCvLogoIcon,
  SortAscendingIcon
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  stripSearchParams,
  useNavigate,
  useRouter
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { zodValidator } from '@tanstack/zod-adapter';
import { useEffect, useMemo, useState } from 'react';
import z from 'zod';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { orpc, type RouterOutput } from '@/integrations/orpc/client';
import { DashboardHeader } from '../-components/header';
import {
  ResumeFilterPopover,
  type ResumeFiltersApplied
} from './-components/filter';
import { GridView } from './-components/grid-view';
import { ListView } from './-components/list-view';

type SortOption = 'lastUpdatedAt' | 'createdAt' | 'name';

const searchSchema = z.object({
  sort: z.enum(['lastUpdatedAt', 'createdAt', 'name']).default('lastUpdatedAt'),
  // Backwards-compat: used by some redirects/tools; not used by UI.
  tags: z.array(z.string()).default([]),
  // Used for deep-links and navigation from Projects -> "View Resumes"
  projectId: z.string().optional(),
  projectName: z.string().optional()
});

export const Route = createFileRoute('/dashboard/resumes/')({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [
      stripSearchParams({
        sort: 'lastUpdatedAt',
        tags: []
      })
    ]
  },
  loader: async () => {
    const view = await getViewServerFn();
    return { view };
  }
});

function RouteComponent() {
  const router = useRouter();
  const { i18n } = useLingui();
  const { view } = Route.useLoaderData();
  const { sort, projectId, projectName } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const initialFiltersFromNav = router.state.location.state as
    | undefined
    | {
        resumeFilters?: Partial<Pick<ResumeFiltersApplied, 'projectId' | 'projectName'>>;
      };

  const [appliedFilters, setAppliedFilters] = useState<ResumeFiltersApplied>(() => ({
    query: '',
    projectId: projectId ?? initialFiltersFromNav?.resumeFilters?.projectId,
    projectName: projectName ?? '',
    customerId: undefined,
    customerName: '',
    skillIds: [],
    skillNames: [],
    positionId: undefined,
    positionName: ''
  }));

  useEffect(() => {
    // Keep UI in sync with URL when user deep-links or changes query params manually.
    setAppliedFilters((prev) => {
      if (prev.projectId === projectId && prev.projectName === (projectName ?? '')) return prev;
      return {
        ...prev,
        projectId,
        projectName: projectName ?? ''
      };
    });
  }, [projectId, projectName]);

  const { data: resumes } = useQuery(
    orpc.resume.list.queryOptions({
      input: {
        sort,
        query: appliedFilters.query?.trim() || undefined,
        projectId: appliedFilters.projectId,
        customerId: appliedFilters.customerId,
        skillIds: appliedFilters.skillIds.length > 0 ? appliedFilters.skillIds : undefined,
        positionId: appliedFilters.positionId
      }
    })
  );

  const sortOptions = useMemo(() => {
    return [
      { value: 'lastUpdatedAt', label: i18n.t('Last Updated') },
      { value: 'createdAt', label: i18n.t('Created') },
      { value: 'name', label: i18n.t('Name') }
    ];
  }, [i18n]);

  const onViewChange = (value: string) => {
    setViewServerFn({ data: value as 'grid' | 'list' });
    router.invalidate();
  };

  const handleFiltersChange = (filters: ResumeFiltersApplied) => {
    setAppliedFilters(filters);
  };

  return (
    <div className="space-y-4">
      <DashboardHeader icon={ReadCvLogoIcon} title={t`Resumes`} />

      <Separator />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ResumeFilterPopover
          appliedFilters={appliedFilters}
          onFiltersChange={handleFiltersChange}
          projectId={appliedFilters.projectId}
        />

        <Combobox
          value={sort}
          options={sortOptions}
          onValueChange={(value) => {
            if (!value) return;
            navigate({ search: { sort: value as SortOption } });
          }}
          buttonProps={{
            title: t`Sort by`,
            variant: 'ghost',
            children: (_, option) => (
              <>
                <SortAscendingIcon />
                {option?.label}
              </>
            )
          }}
        />

        <Tabs
          className="ltr:ms-auto rtl:me-auto"
          value={view}
          onValueChange={onViewChange}>
          <TabsList>
            <TabsTrigger value="grid" className="rounded-r-none">
              <GridFourIcon />
              <Trans>Grid</Trans>
            </TabsTrigger>
            <TabsTrigger value="list" className="rounded-l-none">
              <ListIcon />
              <Trans>List</Trans>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'list' ? (
        <ListView resumes={(resumes ?? []) as RouterOutput['resume']['list']} />
      ) : (
        <GridView resumes={(resumes ?? []) as RouterOutput['resume']['list']} />
      )}
    </div>
  );
}

const RESUMES_VIEW_COOKIE_NAME = 'resumes_view';

const viewSchema = z.enum(['grid', 'list']).catch('grid');

const setViewServerFn = createServerFn({ method: 'POST' })
  .inputValidator(viewSchema)
  .handler(async ({ data }) => {
    setCookie(RESUMES_VIEW_COOKIE_NAME, JSON.stringify(data));
  });

const getViewServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const view = getCookie(RESUMES_VIEW_COOKIE_NAME);
  if (!view) return 'grid';
  return viewSchema.parse(JSON.parse(view));
});
