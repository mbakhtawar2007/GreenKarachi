import React from 'react';
import {
  addProgressUpdate,
  changeProjectStatus,
  confirmPledge,
  createProject,
  declinePledge,
  discoverProjects,
  getMyPledges,
  getMyProjects,
  getProject,
  submitPledge,
  updateProject,
  withdrawPledge,
  type ContactPreference,
  type PlantationProject,
  type Pledge,
  type PledgeType,
  type ProjectFilters
} from '../api/projects';
import type { AuthSession } from '../App';

const currency = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 });
const formatMoney = (value: string | number | null | undefined) =>
  value === null || value === undefined ? '—' : currency.format(Number(value));
const statusLabel = (status: string) => status.replaceAll('_', ' ');

const inputClass = 'mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200';

type RequirementForm = { plantName: string; species: string; quantity: string; notes: string };

type ProjectForm = {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  treeTarget: string;
  fundingTarget: string;
  photoUrls: string;
  contactPreference: ContactPreference;
  contactDetails: string;
  requirements: RequirementForm[];
};

const emptyForm: ProjectForm = {
  title: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  treeTarget: '500',
  fundingTarget: '',
  photoUrls: '',
  contactPreference: 'PLATFORM_ONLY',
  contactDetails: '',
  requirements: [{ plantName: '', species: '', quantity: '100', notes: '' }]
};

type PledgeForm = { pledgeType: PledgeType; amount: string; quantity: string; description: string };
const emptyPledgeForm: PledgeForm = { pledgeType: 'FUNDS', amount: '', quantity: '', description: '' };

type ProgressForm = { title: string; body: string; treesPlanted: string; photoUrls: string };
const emptyProgressForm: ProgressForm = { title: '', body: '', treesPlanted: '', photoUrls: '' };

// Pledge accounting, stated plainly everywhere it appears: the totals are
// intended support from pledges, never money received.
const PledgeSummaryBox: React.FC<{ project: PlantationProject }> = ({ project }) => {
  const summary = project.pledge_summary;
  if (!summary) return null;
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
      <p className="font-semibold text-amber-900">Intended support (pledges) — not funds received</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <div><dt className="text-gray-500">Active pledges</dt><dd className="font-semibold">{summary.active_count}</dd></div>
        <div><dt className="text-gray-500">Intended funds pledged</dt><dd className="font-semibold">{formatMoney(summary.intended_funds_total)}</dd></div>
        <div><dt className="text-gray-500">Intended trees pledged</dt><dd className="font-semibold">{summary.intended_trees_total}</dd></div>
        <div><dt className="text-gray-500">Funds received</dt><dd className="font-semibold">{formatMoney(summary.funds_received)}</dd></div>
      </dl>
      <p className="mt-2 text-gray-600">
        A pledge is an intention to support, not a payment. GreenKarachi does not collect or hold money,
        and no amount is shown as received without a verified receipt process.
      </p>
    </div>
  );
};

const ProjectCard: React.FC<{ project: PlantationProject; onSelect: (id: string) => void }> = ({ project, onSelect }) => (
  <article className="flex flex-col rounded-lg bg-white p-5 shadow">
    {project.photo_urls[0] && (
      <img src={project.photo_urls[0]} alt="" className="mb-3 h-36 w-full rounded object-cover" />
    )}
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-semibold text-green-900">{project.title}</h3>
      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{statusLabel(project.status)}</span>
    </div>
    <p className="mt-1 line-clamp-3 text-sm text-gray-600">{project.description}</p>
    <dl className="mt-3 space-y-1 text-sm text-gray-600">
      <div className="flex justify-between"><dt>Location</dt><dd className="font-medium text-gray-800">{project.location}</dd></div>
      <div className="flex justify-between"><dt>Timeline</dt><dd className="font-medium text-gray-800">{project.start_date} → {project.end_date}</dd></div>
      <div className="flex justify-between"><dt>Tree target</dt><dd className="font-medium text-gray-800">{project.tree_target} trees</dd></div>
      <div className="flex justify-between"><dt>Funding target (goal)</dt><dd className="font-medium text-gray-800">{formatMoney(project.funding_target)}</dd></div>
    </dl>
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Reported planted: {project.trees_planted ?? 0} trees</span><span>{project.progress_percent ?? 0}%</span>
      </div>
      <div className="mt-1 h-2 rounded bg-green-100">
        <div className="h-2 rounded bg-green-600" style={{ width: `${project.progress_percent ?? 0}%` }} />
      </div>
    </div>
    {project.pledge_summary && (
      <p className="mt-3 text-xs text-gray-500">
        {project.pledge_summary.active_count} active pledge(s) · {formatMoney(project.pledge_summary.intended_funds_total)} intended — not received
      </p>
    )}
    <button
      type="button"
      onClick={() => onSelect(project.id)}
      className="mt-4 rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
    >
      View details
    </button>
  </article>
);

const ProjectsPage: React.FC<{ session: AuthSession | null }> = ({ session }) => {
  const isOrganizer = Boolean(session?.user.roles.includes('PLANTATION_ORGANIZER'));
  const [projects, setProjects] = React.useState<PlantationProject[]>([]);
  const [myProjects, setMyProjects] = React.useState<PlantationProject[]>([]);
  const [myPledges, setMyPledges] = React.useState<Pledge[]>([]);
  const [selected, setSelected] = React.useState<PlantationProject | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const [filters, setFilters] = React.useState({ query: '', location: '', species: '', status: 'PUBLISHED' as 'PUBLISHED' | 'COMPLETED', minTreeTarget: '', maxTreeTarget: '' });
  const [form, setForm] = React.useState<ProjectForm>(emptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pledgeForm, setPledgeForm] = React.useState<PledgeForm>(emptyPledgeForm);
  const [progressForms, setProgressForms] = React.useState<Record<string, ProgressForm>>({});

  const loadDiscovery = async (nextFilters: ProjectFilters = {
    query: filters.query || undefined,
    location: filters.location || undefined,
    species: filters.species || undefined,
    status: filters.status,
    minTreeTarget: filters.minTreeTarget ? Number(filters.minTreeTarget) : undefined,
    maxTreeTarget: filters.maxTreeTarget ? Number(filters.maxTreeTarget) : undefined
  }) => {
    const result = await discoverProjects(nextFilters, session?.token);
    setProjects(result.projects);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await loadDiscovery();
      if (session) {
        const pledges = await getMyPledges(session.token);
        setMyPledges(pledges.pledges);
        if (isOrganizer) {
          const mine = await getMyProjects(session.token);
          setMyProjects(mine.projects);
        }
      }
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void loadData(); }, [session?.token]);

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await loadData();
      if (selected) {
        const refreshed = await getProject(selected.id, session?.token);
        setSelected(refreshed.project);
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The action could not be completed.');
    } finally {
      setSaving(false);
    }
  };

  const selectProject = async (projectId: string) => {
    setError('');
    try {
      const result = await getProject(projectId, session?.token);
      setSelected(result.project);
      setPledgeForm(emptyPledgeForm);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : 'Unable to load this project.');
    }
  };

  const requirementsTotal = form.requirements.reduce((sum, requirement) => sum + (Number(requirement.quantity) || 0), 0);

  const submitProjectForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    const input = {
      title: form.title,
      description: form.description,
      location: form.location,
      startDate: form.startDate,
      endDate: form.endDate,
      treeTarget: Number(form.treeTarget),
      fundingTarget: form.fundingTarget ? Number(form.fundingTarget) : null,
      photoUrls: form.photoUrls.split('\n').map((url) => url.trim()).filter(Boolean),
      contactPreference: form.contactPreference,
      contactDetails: form.contactDetails,
      requirements: form.requirements.map((requirement) => ({
        plantName: requirement.plantName,
        species: requirement.species,
        quantity: Number(requirement.quantity),
        notes: requirement.notes
      }))
    };
    await runAction(async () => {
      if (editingId) await updateProject(session.token, editingId, input);
      else await createProject(session.token, input);
      setForm(emptyForm);
      setEditingId(null);
    }, editingId ? 'Project updated.' : 'Project created as a draft. Publish it when you are ready.');
  };

  const startEditing = (project: PlantationProject) => {
    setEditingId(project.id);
    setForm({
      title: project.title,
      description: project.description,
      location: project.location,
      startDate: project.start_date,
      endDate: project.end_date,
      treeTarget: String(project.tree_target),
      fundingTarget: project.funding_target === null ? '' : String(project.funding_target),
      photoUrls: project.photo_urls.join('\n'),
      contactPreference: project.contact_preference,
      contactDetails: project.contact_details ?? '',
      requirements: (project.requirements ?? []).map((requirement) => ({
        plantName: requirement.plant_name,
        species: requirement.species ?? '',
        quantity: String(requirement.quantity),
        notes: requirement.notes ?? ''
      }))
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePledgeForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !selected) return;
    const input = {
      pledgeType: pledgeForm.pledgeType,
      amount: pledgeForm.pledgeType === 'FUNDS' ? Number(pledgeForm.amount) : null,
      quantity: pledgeForm.pledgeType === 'TREES' || pledgeForm.pledgeType === 'MATERIALS' ? Number(pledgeForm.quantity) : null,
      description: pledgeForm.description
    };
    await runAction(
      async () => { await submitPledge(session.token, selected.id, input); },
      'Pledge recorded. This is an intention to support — no payment has been taken or received.'
    );
  };

  const submitProgress = async (event: React.FormEvent, projectId: string) => {
    event.preventDefault();
    if (!session) return;
    const progress = progressForms[projectId] ?? emptyProgressForm;
    await runAction(async () => {
      await addProgressUpdate(session.token, projectId, {
        title: progress.title,
        body: progress.body,
        treesPlanted: progress.treesPlanted ? Number(progress.treesPlanted) : null,
        photoUrls: progress.photoUrls.split('\n').map((url) => url.trim()).filter(Boolean)
      });
      setProgressForms((current) => ({ ...current, [projectId]: emptyProgressForm }));
    }, 'Progress update published.');
  };

  const selectedIsMine = selected && session ? selected.organizer_user_id === session.user.id : false;

  return (
    <section className="py-10">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="text-4xl font-bold text-green-800">Plantation Projects</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Organizers publish plantation projects with the species and quantities they need. Donors, investors,
          businesses, and other supporters register pledges of intended support. A pledge is a coordination
          record only — it is not a payment, and GreenKarachi does not collect money.
        </p>

        {error && <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}

        {/* Discovery filters */}
        <form
          className="mt-6 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow sm:grid-cols-3 lg:grid-cols-6"
          onSubmit={(event) => { event.preventDefault(); void runAction(loadDiscovery, 'Filters applied.'); }}
        >
          <label className="text-sm">Search<input className={inputClass} value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Title, description…" /></label>
          <label className="text-sm">Location<input className={inputClass} value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} placeholder="Clifton" /></label>
          <label className="text-sm">Species / plant<input className={inputClass} value={filters.species} onChange={(e) => setFilters({ ...filters, species: e.target.value })} placeholder="Neem" /></label>
          <label className="text-sm">Status
            <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as 'PUBLISHED' | 'COMPLETED' })}>
              <option value="PUBLISHED">Published</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>
          <label className="text-sm">Min tree target<input className={inputClass} type="number" min="0" value={filters.minTreeTarget} onChange={(e) => setFilters({ ...filters, minTreeTarget: e.target.value })} /></label>
          <label className="text-sm">Max tree target<input className={inputClass} type="number" min="0" value={filters.maxTreeTarget} onChange={(e) => setFilters({ ...filters, maxTreeTarget: e.target.value })} /></label>
          <button type="submit" disabled={saving} className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50 sm:col-span-3 lg:col-span-6">Apply filters</button>
        </form>

        {/* Discovery grid */}
        {loading ? (
          <p className="mt-8 text-gray-600">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="mt-8 rounded bg-white p-6 text-gray-600 shadow">No projects match these filters yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => <ProjectCard key={project.id} project={project} onSelect={(id) => void selectProject(id)} />)}
          </div>
        )}

        {/* Detail view */}
        {selected && (
          <article className="mt-10 rounded-lg bg-white p-6 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-green-900">{selected.title}</h2>
                <p className="text-sm text-gray-500">{selected.location} · {selected.start_date} → {selected.end_date} · {statusLabel(selected.status)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Close details</button>
            </div>
            <p className="mt-3 text-gray-700">{selected.description}</p>
            {selected.photo_urls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {selected.photo_urls.map((url) => <img key={url} src={url} alt="" className="h-28 w-full rounded object-cover" />)}
              </div>
            )}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Reported planted: {selected.trees_planted ?? 0} of {selected.tree_target} trees</span><span>{selected.progress_percent ?? 0}%</span>
              </div>
              <div className="mt-1 h-2 rounded bg-green-100"><div className="h-2 rounded bg-green-600" style={{ width: `${selected.progress_percent ?? 0}%` }} /></div>
            </div>

            <h3 className="mt-6 font-semibold text-green-900">Plant requirements</h3>
            {(selected.requirements ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">No requirements recorded.</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100 text-sm">
                {(selected.requirements ?? []).map((requirement, index) => (
                  <li key={requirement.id ?? index} className="flex justify-between py-2">
                    <span>{requirement.plant_name}{requirement.species ? ` (${requirement.species})` : ''}{requirement.notes ? ` — ${requirement.notes}` : ''}</span>
                    <span className="font-semibold">{requirement.quantity} plants</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-sm text-gray-600">
              Contact preference: {statusLabel(selected.contact_preference)}
              {selected.contact_details ? <> · {selected.contact_details}</> : selected.contact_preference === 'PLATFORM_ONLY' ? ' · Coordinate through GreenKarachi participants.' : ''}
            </p>
            {selected.funding_target !== null && (
              <p className="mt-1 text-sm text-gray-600">Funding target (goal the organizer is seeking support toward): {formatMoney(selected.funding_target)}</p>
            )}

            <div className="mt-4"><PledgeSummaryBox project={selected} /></div>

            <h3 className="mt-6 font-semibold text-green-900">Progress updates</h3>
            {(selected.progress_updates ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">No progress updates yet.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {(selected.progress_updates ?? []).map((update) => (
                  <li key={update.id} className="rounded border border-gray-100 p-3">
                    <p className="font-medium">{update.title} <span className="text-xs font-normal text-gray-400">{new Date(update.created_at).toLocaleDateString()}</span></p>
                    <p className="text-sm text-gray-600">{update.body}</p>
                    {update.trees_planted !== null && <p className="text-sm text-gray-600">Reported planted so far: {update.trees_planted} trees</p>}
                  </li>
                ))}
              </ul>
            )}

            {/* Pledges visible to this viewer (organizer: all; supporter: own) */}
            {(selected.pledges ?? []).length > 0 && (
              <>
                <h3 className="mt-6 font-semibold text-green-900">{selectedIsMine ? 'Pledges on this project' : 'Your pledges on this project'}</h3>
                <ul className="mt-2 divide-y divide-gray-100 text-sm">
                  {(selected.pledges ?? []).map((pledge) => (
                    <li key={pledge.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span>
                        {statusLabel(pledge.pledge_type)} — {pledge.pledge_type === 'FUNDS' ? formatMoney(pledge.amount) : pledge.quantity ? `${pledge.quantity} items/plants` : pledge.description ?? ''}
                        {' · '}<span className="font-medium">{statusLabel(pledge.status)}</span> (intended, not received)
                      </span>
                      <span className="flex gap-2">
                        {selectedIsMine && pledge.status === 'PLEDGED' && (
                          <>
                            <button type="button" disabled={saving} onClick={() => void runAction(() => confirmPledge(session!.token, pledge.id), 'Pledge confirmed as intended support. No funds were recorded as received.')} className="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-800 disabled:opacity-50">Confirm intention</button>
                            <button type="button" disabled={saving} onClick={() => void runAction(() => declinePledge(session!.token, pledge.id), 'Pledge declined.')} className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50">Decline</button>
                          </>
                        )}
                        {!selectedIsMine && (pledge.status === 'PLEDGED' || pledge.status === 'CONFIRMED') && session && (
                          <button type="button" disabled={saving} onClick={() => void runAction(() => withdrawPledge(session.token, pledge.id), 'Pledge withdrawn.')} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50">Withdraw</button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Pledge form for signed-in supporters */}
            {session && !selectedIsMine && selected.status === 'PUBLISHED' && (
              <form className="mt-6 rounded border border-green-100 bg-green-50 p-4" onSubmit={(event) => void handlePledgeForm(event)}>
                <h3 className="font-semibold text-green-900">Pledge support (intention only — not a payment)</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-sm">Pledge type
                    <select className={inputClass} value={pledgeForm.pledgeType} onChange={(e) => setPledgeForm({ ...pledgeForm, pledgeType: e.target.value as PledgeType })}>
                      <option value="FUNDS">Funds (intended amount)</option>
                      <option value="TREES">Trees / plants (quantity)</option>
                      <option value="MATERIALS">Materials (quantity)</option>
                      <option value="VOLUNTEER_TIME">Volunteer time (describe)</option>
                      <option value="OTHER">Other support (describe)</option>
                    </select>
                  </label>
                  {pledgeForm.pledgeType === 'FUNDS' && (
                    <label className="text-sm">Intended amount (PKR)<input className={inputClass} type="number" min="1" step="0.01" required value={pledgeForm.amount} onChange={(e) => setPledgeForm({ ...pledgeForm, amount: e.target.value })} /></label>
                  )}
                  {(pledgeForm.pledgeType === 'TREES' || pledgeForm.pledgeType === 'MATERIALS') && (
                    <label className="text-sm">Intended quantity<input className={inputClass} type="number" min="1" step="1" required value={pledgeForm.quantity} onChange={(e) => setPledgeForm({ ...pledgeForm, quantity: e.target.value })} /></label>
                  )}
                  <label className="text-sm sm:col-span-2">Description / notes
                    <input className={inputClass} required={pledgeForm.pledgeType === 'VOLUNTEER_TIME' || pledgeForm.pledgeType === 'OTHER'} value={pledgeForm.description} onChange={(e) => setPledgeForm({ ...pledgeForm, description: e.target.value })} placeholder="How you intend to support this project" />
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">Recording a pledge does not transfer any money. The organizer will coordinate with you directly about any actual contribution.</p>
                <button type="submit" disabled={saving} className="mt-3 rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">Record pledge of intention</button>
              </form>
            )}
            {!session && selected.status === 'PUBLISHED' && (
              <p className="mt-6 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">Sign in to record a pledge of support for this project.</p>
            )}
          </article>
        )}

        {/* My pledges */}
        {session && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-green-800">My pledges</h2>
            {myPledges.length === 0 ? (
              <p className="mt-3 rounded bg-white p-5 text-gray-600 shadow">You have not recorded any pledges yet. Open a published project above to pledge intended support.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 rounded-lg bg-white shadow">
                {myPledges.map((pledge) => (
                  <li key={pledge.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                    <span>
                      <span className="font-semibold">{pledge.project?.title ?? 'Project'}</span> — {statusLabel(pledge.pledge_type)}
                      {pledge.pledge_type === 'FUNDS' ? ` · ${formatMoney(pledge.amount)} intended` : pledge.quantity ? ` · ${pledge.quantity} intended` : pledge.description ? ` · ${pledge.description}` : ''}
                      {' · '}<span className="font-medium">{statusLabel(pledge.status)}</span> (not a payment)
                    </span>
                    {(pledge.status === 'PLEDGED' || pledge.status === 'CONFIRMED') && (
                      <button type="button" disabled={saving} onClick={() => void runAction(() => withdrawPledge(session.token, pledge.id), 'Pledge withdrawn.')} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50">Withdraw</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Organizer dashboard */}
        {isOrganizer && session && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-green-800">Organizer dashboard</h2>
            <form className="mt-4 rounded-lg bg-white p-5 shadow" onSubmit={(event) => void submitProjectForm(event)}>
              <h3 className="font-semibold text-green-900">{editingId ? 'Edit project' : 'Create a new project (starts as a draft)'}</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">Title<input className={inputClass} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                <label className="text-sm">Location<input className={inputClass} required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Clifton, Karachi" /></label>
                <label className="text-sm sm:col-span-2">Description<textarea className={inputClass} required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                <label className="text-sm">Start date<input className={inputClass} type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
                <label className="text-sm">End date<input className={inputClass} type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
                <label className="text-sm">Tree target<input className={inputClass} type="number" min="1" step="1" required value={form.treeTarget} onChange={(e) => setForm({ ...form, treeTarget: e.target.value })} /></label>
                <label className="text-sm">Funding target in PKR (optional goal, not funds received)<input className={inputClass} type="number" min="1" step="0.01" value={form.fundingTarget} onChange={(e) => setForm({ ...form, fundingTarget: e.target.value })} /></label>
                <label className="text-sm">Contact preference
                  <select className={inputClass} value={form.contactPreference} onChange={(e) => setForm({ ...form, contactPreference: e.target.value as ContactPreference })}>
                    <option value="PLATFORM_ONLY">Platform only</option>
                    <option value="EMAIL">Email</option>
                    <option value="PHONE">Phone</option>
                    <option value="EMAIL_AND_PHONE">Email and phone</option>
                  </select>
                </label>
                <label className="text-sm">Contact details (required unless platform only)<input className={inputClass} value={form.contactDetails} onChange={(e) => setForm({ ...form, contactDetails: e.target.value })} /></label>
                <label className="text-sm sm:col-span-2">Photo URLs (one per line, optional)<textarea className={inputClass} rows={2} value={form.photoUrls} onChange={(e) => setForm({ ...form, photoUrls: e.target.value })} placeholder="https://…" /></label>
              </div>

              <h4 className="mt-5 font-semibold text-green-900">Plant requirements (must add up to no more than the tree target)</h4>
              {form.requirements.map((requirement, index) => (
                <div key={index} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <label className="text-sm">Plant name<input className={inputClass} required value={requirement.plantName} onChange={(e) => setForm({ ...form, requirements: form.requirements.map((row, i) => i === index ? { ...row, plantName: e.target.value } : row) })} /></label>
                  <label className="text-sm">Species<input className={inputClass} value={requirement.species} onChange={(e) => setForm({ ...form, requirements: form.requirements.map((row, i) => i === index ? { ...row, species: e.target.value } : row) })} /></label>
                  <label className="text-sm">Quantity<input className={inputClass} type="number" min="1" step="1" required value={requirement.quantity} onChange={(e) => setForm({ ...form, requirements: form.requirements.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row) })} /></label>
                  <label className="text-sm">Notes<input className={inputClass} value={requirement.notes} onChange={(e) => setForm({ ...form, requirements: form.requirements.map((row, i) => i === index ? { ...row, notes: e.target.value } : row) })} /></label>
                </div>
              ))}
              <p className="mt-2 text-sm text-gray-500">Requirements total: {requirementsTotal} of {form.treeTarget || 0} trees</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, requirements: [...form.requirements, { plantName: '', species: '', quantity: '50', notes: '' }] })} className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Add requirement</button>
                {form.requirements.length > 1 && (
                  <button type="button" onClick={() => setForm({ ...form, requirements: form.requirements.slice(0, -1) })} className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Remove last requirement</button>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={saving} className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">{editingId ? 'Save changes' : 'Create draft project'}</button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancel editing</button>
                )}
              </div>
            </form>

            <h3 className="mt-8 font-semibold text-green-900">Your projects</h3>
            {myProjects.length === 0 ? (
              <p className="mt-3 rounded bg-white p-5 text-gray-600 shadow">You have no projects yet. Create your first draft above.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {myProjects.map((project) => {
                  const progress = progressForms[project.id] ?? emptyProgressForm;
                  return (
                    <li key={project.id} className="rounded-lg bg-white p-5 shadow">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{project.title} <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{statusLabel(project.status)}</span></p>
                        <span className="flex flex-wrap gap-2 text-sm">
                          <button type="button" onClick={() => void selectProject(project.id)} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">Details</button>
                          {project.status !== 'ARCHIVED' && <button type="button" onClick={() => startEditing(project)} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">Edit</button>}
                          {project.status === 'DRAFT' && <button type="button" disabled={saving} onClick={() => void runAction(() => changeProjectStatus(session.token, project.id, 'PUBLISHED'), 'Project published. Supporters can now pledge intended support.')} className="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-800 disabled:opacity-50">Publish</button>}
                          {project.status === 'PUBLISHED' && <button type="button" disabled={saving} onClick={() => void runAction(() => changeProjectStatus(session.token, project.id, 'COMPLETED'), 'Project marked completed.')} className="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-800 disabled:opacity-50">Mark completed</button>}
                          {project.status !== 'ARCHIVED' && <button type="button" disabled={saving} onClick={() => void runAction(() => changeProjectStatus(session.token, project.id, 'ARCHIVED'), 'Project archived.')} className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50">Archive</button>}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{project.location} · target {project.tree_target} trees · reported planted {project.trees_planted ?? 0} ({project.progress_percent ?? 0}%)</p>
                      {project.pledge_summary && (
                        <p className="text-sm text-gray-600">{project.pledge_summary.active_count} active pledge(s) · {formatMoney(project.pledge_summary.intended_funds_total)} intended funds · {formatMoney(project.pledge_summary.funds_received)} received</p>
                      )}
                      {project.status !== 'ARCHIVED' && (
                        <form className="mt-3 grid grid-cols-1 gap-2 rounded border border-gray-100 p-3 sm:grid-cols-2" onSubmit={(event) => void submitProgress(event, project.id)}>
                          <p className="font-medium sm:col-span-2">Add a progress update</p>
                          <label className="text-sm">Title<input className={inputClass} required value={progress.title} onChange={(e) => setProgressForms({ ...progressForms, [project.id]: { ...progress, title: e.target.value } })} /></label>
                          <label className="text-sm">Trees planted so far (cumulative)<input className={inputClass} type="number" min="0" step="1" value={progress.treesPlanted} onChange={(e) => setProgressForms({ ...progressForms, [project.id]: { ...progress, treesPlanted: e.target.value } })} /></label>
                          <label className="text-sm sm:col-span-2">Update<textarea className={inputClass} required rows={2} value={progress.body} onChange={(e) => setProgressForms({ ...progressForms, [project.id]: { ...progress, body: e.target.value } })} /></label>
                          <label className="text-sm sm:col-span-2">Photo URLs (one per line, optional)<textarea className={inputClass} rows={1} value={progress.photoUrls} onChange={(e) => setProgressForms({ ...progressForms, [project.id]: { ...progress, photoUrls: e.target.value } })} /></label>
                          <button type="submit" disabled={saving} className="rounded bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50 sm:col-span-2">Publish progress update</button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </section>
  );
};

export default ProjectsPage;
