import { useEffect, useMemo, useState } from 'react';

const emptyForm = { name: '', image: null };

function formatDate(value) {
  if (!value) return 'Unknown time';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function App() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const visibleImages = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return images;
    return images.filter((image) => image.name.toLowerCase().includes(needle));
  }, [images, searchTerm]);

  async function fetchImages() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/images');
      if (!response.ok) throw new Error('Unable to load images');
      const data = await response.json();
      setImages(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchImages();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Please add a name.');
      return;
    }
    if (!editingId && !form.image) {
      setError('Please choose an image.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      if (form.image) {
        payload.append('image', form.image);
      }

      const response = await fetch(
        editingId ? `/api/images/${editingId}` : '/api/images',
        {
          method: editingId ? 'PUT' : 'POST',
          body: payload
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Save failed');
      }

      await fetchImages();
      resetForm();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(image) {
    setEditingId(image.id);
    setForm({ name: image.name, image: null });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this image?')) return;
    setError('');
    try {
      const response = await fetch(`/api/images/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Delete failed');
      }
      if (lookupResult?.id === id) {
        setLookupResult(null);
      }
      await fetchImages();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
  }

  async function handleLookup(event) {
    event.preventDefault();
    if (!lookupId.trim()) {
      setLookupResult(null);
      return;
    }

    setLookupLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/images/${lookupId.trim()}`);
      if (!response.ok) {
        setLookupResult(null);
        if (response.status === 404) {
          throw new Error('No image found for that id.');
        }
        throw new Error('Lookup failed');
      }
      const data = await response.json();
      setLookupResult(data);
    } catch (err) {
      setLookupResult(null);
      setError(err.message || 'Something went wrong');
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className="app">
        <section className="hero">
          <div>
            <p className="eyebrow">Image uploader</p>
            <h1>Upload, manage, and find images by name or id.</h1>
            <p className="lede">
              Add a name and image, edit records in place, delete when you want a clean slate,
              and browse everything as polished cards.
            </p>
          </div>

          <form className="card form-card" onSubmit={handleSubmit}>
            <div className="card-header">
              <h2>{editingId ? 'Update image' : 'Add image'}</h2>
              {editingId ? <span className="badge">Editing</span> : null}
            </div>

            <label>
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Enter a name"
              />
            </label>

            <label>
              <span>Image file</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, image: event.target.files?.[0] || null }))
                }
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update record' : 'Upload image'}
              </button>
              <button type="button" className="ghost" onClick={resetForm}>
                Clear
              </button>
            </div>

            {editingId ? <p className="hint">Uploading a new file will replace the current image.</p> : null}
          </form>
        </section>

        <section className="toolbar">
          <label className="search">
            <span>Search by name</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter cards"
            />
          </label>

          <form className="lookup" onSubmit={handleLookup}>
            <label>
              <span>Get by id</span>
              <input
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
                placeholder="Paste an id"
              />
            </label>
            <button type="submit" className="secondary" disabled={lookupLoading}>
              {lookupLoading ? 'Finding...' : 'Fetch'}
            </button>
          </form>
        </section>

        {error ? <div className="alert">{error}</div> : null}

        {lookupResult ? (
          <section className="detail-panel card">
            <div className="card-header">
              <h2>Image by id</h2>
              <button className="ghost" type="button" onClick={() => setLookupResult(null)}>
                Hide
              </button>
            </div>
            <div className="detail-grid">
              <img src={lookupResult.imageUrl} alt={lookupResult.name} className="detail-image" />
              <div>
                <h3>{lookupResult.name}</h3>
                <p><strong>ID:</strong> {lookupResult.id}</p>
                <p><strong>Uploaded:</strong> {formatDate(lookupResult.createdAt)}</p>
                <p><strong>Updated:</strong> {formatDate(lookupResult.updatedAt)}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="cards-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Gallery</p>
              <h2>{visibleImages.length} stored image{visibleImages.length === 1 ? '' : 's'}</h2>
            </div>
            <button type="button" className="ghost" onClick={fetchImages} disabled={loading}>
              Refresh
            </button>
          </div>

          {loading ? <div className="state">Loading images...</div> : null}

          {!loading && visibleImages.length === 0 ? (
            <div className="state">No images yet. Upload the first one above.</div>
          ) : null}

          <div className="grid">
            {visibleImages.map((image) => (
              <article className="card image-card" key={image.id}>
                <img src={image.imageUrl} alt={image.name} className="image-thumb" />
                <div className="card-body">
                  <div className="card-header">
                    <h3>{image.name}</h3>
                    <span className="chip">{image.id.slice(0, 8)}</span>
                  </div>
                  <p className="meta">
                    <span>{formatDate(image.createdAt)}</span>
                    <span>{image.originalName}</span>
                  </p>
                </div>
                <div className="card-actions">
                  <button type="button" className="secondary" onClick={() => beginEdit(image)}>
                    Update
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(image.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
