"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Box, Typography, Card, CardContent, Grid, TextField, Checkbox, FormControlLabel, Chip, Button, Alert, CircularProgress, Divider } from "@mui/material"
import { get, child, ref, update } from "firebase/database"
import { db } from "../../../backend/services/Firebase"

interface CourseItem { itemId: string; name: string }
interface ProfileCourse { id?: string; name: string; courseId?: string; minPerPerson?: number; maxPerPerson?: number; items: Array<{ itemId: string }> }
interface PreorderProfile { id?: string; name: string; description?: string; courses: ProfileCourse[] }

interface PersonRow {
  firstName: string
  lastName: string
  allergies?: string
  selections: Record<string, string[]> // key: courseId, value: itemIds
}

const PreorderPage: React.FC = () => {
  const { companyId, siteId, bookingId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<any>(null)
  const [profile, setProfile] = useState<PreorderProfile | null>(null)
  const [courseItems, setCourseItems] = useState<Record<string, CourseItem[]>>({}) // courseId -> items
  const [people, setPeople] = useState<PersonRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!companyId || !siteId || !bookingId) { setError("Invalid link"); setLoading(false); return }
      setLoading(true)
      setError(null)
      try {
        const base = `companies/${companyId}/sites/${siteId}/data/bookings`
        const bookingSnap = await get(child(ref(db), `${base}/bookings/${bookingId}`))
        if (!bookingSnap.exists()) throw new Error("Booking not found")
        const b = bookingSnap.val()
        setBooking(b)

        const profileId = b?.preorder?.profileId
        if (profileId) {
          const profSnap = await get(child(ref(db), `${base}/preorderProfiles/${profileId}`))
          if (profSnap.exists()) setProfile(profSnap.val() as PreorderProfile)
        }

        // Load POS products to map items by courseId
        const stockBase = `companies/${companyId}/sites/${siteId}/data/stock`
        const productsSnap = await get(child(ref(db), `${stockBase}/products`))
        const map: Record<string, CourseItem[]> = {}
        if (productsSnap.exists()) {
          const all = productsSnap.val() || {}
          Object.entries(all).forEach(([pid, pdata]: [string, any]) => {
            const cid = pdata.course || ""
            if (!cid) return
            if (!map[cid]) map[cid] = []
            map[cid].push({ itemId: pid, name: pdata.name })
          })
        }
        setCourseItems(map)

        // Initialize people rows (default to number of guests; allow editing)
        const initialCount = Math.max(1, Number(b?.guests || 1))
        const init: PersonRow[] = Array.from({ length: initialCount }).map(() => ({
          firstName: "",
          lastName: "",
          allergies: "",
          selections: {},
        }))
        setPeople(init)
      } catch (e: any) {
        console.error(e)
        setError(e.message || "Failed to load preorder page")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [companyId, siteId, bookingId])

  const courses = useMemo(() => profile?.courses || [], [profile])

  const toggleSelection = (personIdx: number, courseId?: string, itemId?: string) => {
    if (!courseId || !itemId) return
    setPeople((prev) => {
      const copy = [...prev]
      const p = { ...copy[personIdx] }
      const arr = new Set<string>(p.selections[courseId] || [])
      if (arr.has(itemId)) arr.delete(itemId)
      else arr.add(itemId)
      p.selections = { ...p.selections, [courseId]: Array.from(arr) }
      copy[personIdx] = p
      return copy
    })
  }

  const validate = (): string | null => {
    if (!courses.length) return null
    for (let c of courses) {
      const cid = c.courseId || c.id || ""
      const min = Number(c.minPerPerson || 0)
      const max = Number(c.maxPerPerson || Infinity)
      for (let i = 0; i < people.length; i++) {
        const count = (people[i].selections[cid] || []).length
        if (count < min) return `Person ${i + 1}: please choose at least ${min} item(s) for ${c.name}`
        if (count > max) return `Person ${i + 1}: please choose no more than ${max} item(s) for ${c.name}`
      }
    }
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    if (!companyId || !siteId || !bookingId) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const base = `companies/${companyId}/sites/${siteId}/data/bookings`
      const updates: Record<string, any> = {}
      updates[`${base}/bookings/${bookingId}/preorder/responses`] = people
      // Swap tags Preorder Requested -> Preorder Received
      const tagsSnap = await get(child(ref(db), `${base}/bookings/${bookingId}/tags`))
      const current: string[] = tagsSnap.exists() ? tagsSnap.val() : []
      const next = Array.from(new Set([...(current || [])].filter((t) => t !== "Preorder Requested").concat(["Preorder Received"])) )
      updates[`${base}/bookings/${bookingId}/tags`] = next
      await update(child(ref(db), '/'), updates)
      setSaved(true)
    } catch (e: any) {
      console.error(e)
      setError(e.message || "Failed to save preorder")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  )

  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>Preorder for {booking?.firstName} {booking?.lastName}</Typography>
          {profile && (
            <Typography variant="body2" color="text.secondary" gutterBottom>{profile.name} {profile.description ? `• ${profile.description}` : ''}</Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            {people.map((person, idx) => (
              <Grid item xs={12} key={idx}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Guest {idx + 1}</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" label="First Name" value={person.firstName} onChange={(e) => setPeople((prev) => { const copy=[...prev]; copy[idx] = { ...copy[idx], firstName: e.target.value }; return copy })} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" label="Last Name" value={person.lastName} onChange={(e) => setPeople((prev) => { const copy=[...prev]; copy[idx] = { ...copy[idx], lastName: e.target.value }; return copy })} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" label="Allergies" value={person.allergies} onChange={(e) => setPeople((prev) => { const copy=[...prev]; copy[idx] = { ...copy[idx], allergies: e.target.value }; return copy })} fullWidth />
                      </Grid>
                    </Grid>

                    {courses.map((course) => {
                      const cid = course.courseId || course.id || ""
                      const options = courseItems[cid] || []
                      const selected = new Set(people[idx].selections[cid] || [])
                      const min = Number(course.minPerPerson || 0)
                      const max = Number(course.maxPerPerson || Infinity)
                      return (
                        <Box key={cid} sx={{ mt: 1.5 }}>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>{course.name} {Number.isFinite(max) ? `(choose ${min}-${max})` : `(choose at least ${min})`}</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {options.map((it) => (
                              <FormControlLabel
                                key={it.itemId}
                                control={<Checkbox checked={selected.has(it.itemId)} onChange={() => toggleSelection(idx, cid, it.itemId)} />}
                                label={<Chip size="small" label={it.name} />}
                              />
                            ))}
                          </Box>
                        </Box>
                      )
                    })}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="outlined" onClick={() => setPeople((prev) => [...prev, { firstName: '', lastName: '', allergies: '', selections: {} }])}>Add Guest</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Submit Preorder'}</Button>
            {saved && <Alert severity="success" sx={{ ml: 1 }}>Preorder saved</Alert>}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default PreorderPage


